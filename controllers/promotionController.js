const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const PromotionLocation = require("../models/PromotionLocation");
const Template = require("../models/Template");
const { Op } = require("sequelize");
const { calculatePrice } = require("../utils/calculatePrice");
const {
  getPromotionLocationAttributes,
} = require("../utils/promotionLocationUtils");
const {
  isValidDateRange,
  calculateMonthsFromDateRange,
} = require("../utils/dateUtils");

const extractLatLng = (coordinates) => {
  const value = coordinates?.coordinates;
  if (!Array.isArray(value) || value.length < 2) {
    return { lat: null, lng: null };
  }

  const [lng, lat] = value;
  return {
    lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
  };
};

const buildLegacyLocationShape = (locations = []) => {
  const cities = [];
  const states = [];
  const timezones = [];
  const citySet = new Set();
  const stateSet = new Set();
  const timezoneSet = new Set();

  for (const loc of locations) {
    if (!loc) continue;

    if (loc.type === "city" && loc.city_name) {
      const cityKey = `${loc.city_name}|${loc.state_code || ""}|${loc.country_code || ""}`;
      if (!citySet.has(cityKey)) {
        citySet.add(cityKey);
        const cityCoords = extractLatLng(loc.coordinates);
        cities.push({
          id: loc.id,
          placeId: null,
          name: loc.city_name,
          state_code: loc.state_code || null,
          state_name: loc.state_name || null,
          country_code: loc.country_code || null,
          country_name: null,
          formattedAddress: null,
          lat: cityCoords.lat,
          lng: cityCoords.lng,
        });
      }
    }

    if (loc.type === "state" && loc.state_code) {
      const stateKey = `${loc.state_code}|${loc.country_code || ""}`;
      if (!stateSet.has(stateKey)) {
        stateSet.add(stateKey);
        const stateCoords = extractLatLng(loc.coordinates);
        states.push({
          id: loc.id,
          placeId: null,
          name: loc.state_name || loc.state_code,
          state_code: loc.state_code,
          state_name: loc.state_name || loc.state_code || null,
          country_code: loc.country_code || null,
          country_name: null,
          formattedAddress: null,
          lat: stateCoords.lat,
          lng: stateCoords.lng,
        });
      }
    }

    if (loc.type === "timezone" && loc.timezone) {
      if (!timezoneSet.has(loc.timezone)) {
        timezoneSet.add(loc.timezone);
        timezones.push(loc.timezone);
      }
    }
  }

  return { cities, states, timezones };
};

const normalizePromotionForFrontend = (promotion) => {
  const plain = promotion?.toJSON ? promotion.toJSON() : promotion;
  if (!plain) return plain;

  const legacy = buildLegacyLocationShape(plain.locations || []);
  return {
    ...plain,
    cities:
      Array.isArray(plain.cities) && plain.cities.length
        ? plain.cities
        : legacy.cities,
    states:
      Array.isArray(plain.states) && plain.states.length
        ? plain.states
        : legacy.states,
    timezones:
      Array.isArray(plain.timezones) && plain.timezones.length
        ? plain.timezones
        : legacy.timezones,
  };
};

// @desc    Get all promotions with filters
// @route   GET /api/promotions
// @access  Public
const getPromotions = async (req, res) => {
  try {
    const locationAttributes = await getPromotionLocationAttributes();

    const normalize = (v) => v?.toString().trim().toLowerCase();
    const normalizeUpper = (v) => v?.toString().trim().toUpperCase();

    const country_code = req.query.country_code;
    const state = req.query.state;
    const city = req.query.city;
    const timezone = normalize(req.query.timezone);
    const category = req.query.category;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const normalizedCountryCode = normalizeUpper(country_code);
    const normalizedStateCode = normalizeUpper(state);
    const normalizedCity = city?.toString().trim();
    const hasLocationQuery = Boolean(
      normalizedCountryCode ||
      normalizedStateCode ||
      normalizedCity ||
      timezone,
    );

    let categoryFilter = [];
    if (category) {
      if (Array.isArray(category)) {
        categoryFilter = category
          .map((c) => c?.toString().trim().toLowerCase())
          .filter(Boolean);
      } else if (typeof category === "string") {
        categoryFilter = category
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    let categoryCondition = {};
    if (categoryFilter.length) {
      const matchingBusinesses = await Business.findAll({
        attributes: ["id"],
        where: {
          [Op.or]: categoryFilter.map((cat) => ({
            categories: {
              [Op.contains]: [cat],
            },
          })),
        },
        raw: true,
      });

      const businessIds = matchingBusinesses.map((b) => b.id).filter(Boolean);

      categoryCondition = {
        [Op.or]: [
          {
            categories: {
              [Op.overlap]: categoryFilter,
            },
          },
          ...(businessIds.length
            ? [
                {
                  businessId: {
                    [Op.in]: businessIds,
                  },
                },
              ]
            : []),
        ],
      };
    }

    const whereCondition = {
      status: "active",
      ...categoryCondition,
    };

    const locationWhere = [];
    if (normalizedCountryCode) {
      locationWhere.push({ country_code: normalizedCountryCode });
    }
    if (normalizedStateCode) {
      locationWhere.push({ state_code: normalizedStateCode });
    }
    if (normalizedCity) {
      locationWhere.push({ city_name: { [Op.iLike]: normalizedCity } });
    }
    if (timezone) {
      locationWhere.push({ timezone: { [Op.iLike]: timezone } });
    }

    const locationsInclude = {
      model: PromotionLocation,
      as: "locations",
      attributes: locationAttributes,
      required: hasLocationQuery,
      ...(hasLocationQuery
        ? {
            where: {
              [Op.or]: locationWhere,
            },
          }
        : {}),
    };

    const { rows: promotions, count } = await Promotion.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "categories", "businessAddress"],
          required: false,
        },
        locationsInclude,
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });
    res.json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      promotions: promotions,
    });
  } catch (error) {
    console.error("Promotion Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single promotion
// @route   GET /api/promotions/:id
// @access  Public
const getPromotionById = async (req, res) => {
  try {
    const locationAttributes = await getPromotionLocationAttributes();

    const promotion = await Promotion.findByPk(req.params.id, {
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "category", "phone"],
        },
        {
          model: PromotionLocation,
          as: "locations",
          attributes: locationAttributes,
          required: false,
        },
      ],
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    // Increment views
    promotion.views += 1;
    await promotion.save();

    res.json(normalizePromotionForFrontend(promotion));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Calculate promotion price
// @route   POST /api/promotions/calculate-price
// @access  Public
const calculatePromotionPrice = async (req, res) => {
  try {
    const {
      runDate,
      stopDate,
      runTime,
      stopTime,
      cities = [],
      states = [],
      timezones = [],
    } = req.body;

    if (!isValidDateRange(runDate, stopDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const months = calculateMonthsFromDateRange(runDate, stopDate);

    const price = calculatePrice({
      runDate,
      stopDate,
      runTime,
      stopTime,
      months,
      cities,
      states,
      timezones,
    });

    res.json({ price, months });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all templates
// @route   GET /api/templates
// @access  Public
const getTemplates = async (req, res) => {
  try {
    const templates = await Template.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Increment promotion clicks
// @route   POST /api/promotions/:id/click
// @access  Public
const incrementClick = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    promotion.clicks += 1;
    await promotion.save();

    res.json({ message: "Click recorded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPromotions,
  getPromotionById,
  calculatePromotionPrice,
  getTemplates,
  incrementClick,
};
