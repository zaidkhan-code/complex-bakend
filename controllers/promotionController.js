const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const Template = require("../models/Template");
const { Op, literal } = require("sequelize");
const { calculatePrice } = require("../utils/calculatePrice");
const {
  isValidDateRange,
  calculateMonthsFromDateRange,
} = require("../utils/dateUtils");

// @desc    Get all promotions with filters
// @route   GET /api/promotions
// @access  Public
const getPromotions = async (req, res) => {
  try {
    // -------------------------------
    // 1️⃣ Extract and normalize query params
    // -------------------------------
    const normalize = (v) => v?.toString().trim().toLowerCase();

    const country_code = req.query.country_code;
    const state = req.query.state;
    const city = req.query.city;
    const timezone = normalize(req.query.timezone);
    const category = req.query.category;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    // -------------------------------
    // 2️⃣ Business category filter
    // -------------------------------
    const businessCategoryFilter =
      category && Array.isArray(category)
        ? category
        : category
          ? category.split(",").map((c) => c.trim())
          : null;

    // -------------------------------
    // 3️⃣ Build location filters
    // -------------------------------
    const locationFilters = [];

    if (country_code) {
      locationFilters.push(
        { cities: { [Op.contains]: [{ country_code }] } },
        { states: { [Op.contains]: [{ country_code }] } },
      );
    }

    if (state) {
      locationFilters.push({
        states: { [Op.contains]: [{ state_code: state }] },
      });
    }

    if (city) {
      locationFilters.push({ cities: { [Op.contains]: [{ name: city }] } });
    }

    if (timezone) {
      locationFilters.push({ timezones: { [Op.contains]: [timezone] } });
    }

    const whereCondition = {
      status: "active",
      ...(locationFilters.length ? { [Op.or]: locationFilters } : {}),
    };

    // -------------------------------
    // 4️⃣ Define order priority (closest match first)
    // -------------------------------
    const orderPriority = literal(`
      (CASE
        WHEN cities @> '[{"name":"${city}"}]' THEN 4
        WHEN states @> '[{"state_code":"${state}"}]' THEN 3
        WHEN cities @> '[{"country_code":"${country_code}"}]' THEN 2
        WHEN states @> '[{"country_code":"${country_code}"}]' THEN 1
        ELSE 0
      END) DESC
    `);

    // -------------------------------
    // 5️⃣ Fetch promotions
    // -------------------------------
    const { rows: promotions, count } = await Promotion.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "categories", "businessAddress"],
          where: businessCategoryFilter
            ? literal(
                `"business"."categories" ?| array[${businessCategoryFilter
                  .map((c) => `'${c}'`)
                  .join(",")}]`,
              )
            : undefined,
        },
      ],
      order: [orderPriority, ["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    // -------------------------------
    // 6️⃣ Return response
    // -------------------------------
    res.json({
      success: true,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      promotions,
    });
  } catch (error) {
    console.error("Promotion Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = getPromotions;

// @desc    Get single promotion
// @route   GET /api/promotions/:id
// @access  Public
const getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id, {
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "category", "phone"],
        },
      ],
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    // Increment views
    promotion.views += 1;
    await promotion.save();

    res.json(promotion);
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
