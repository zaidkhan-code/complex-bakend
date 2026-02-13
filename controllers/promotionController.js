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
    // 2️⃣ Clean Category Filter (NULL SAFE)
    // -------------------------------
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
      locationFilters.push({
        cities: { [Op.contains]: [{ name: city }] },
      });
    }

    if (timezone) {
      locationFilters.push({
        timezones: { [Op.contains]: [timezone] },
      });
    }

    // -------------------------------
    // 4️⃣ Category Condition (Promotion OR Business)
    // -------------------------------
    let categoryCondition = {};

    if (categoryFilter.length) {
      categoryCondition = {
        [Op.or]: [
          // Match Promotion categories (ARRAY column)
          {
            categories: {
              [Op.overlap]: categoryFilter,
            },
          },

          // Match Business categories (JSONB column)
          literal(
            `"business"."categories" ?| array[${categoryFilter
              .map((c) => `'${c}'`)
              .join(",")}]`,
          ),
        ],
      };
    }

    // -------------------------------
    // 5️⃣ Final WHERE condition
    // -------------------------------
    const whereCondition = {
      status: "active",
      ...(locationFilters.length ? { [Op.or]: locationFilters } : {}),
      ...categoryCondition,
    };

    // -------------------------------
    // 6️⃣ Order Priority (UNCHANGED)
    // -------------------------------
    const orderPriority = literal(`
      (CASE
        WHEN cities @> '[{"name":"${city || ""}"}]' THEN 4
        WHEN states @> '[{"state_code":"${state || ""}"}]' THEN 3
        WHEN cities @> '[{"country_code":"${country_code || ""}"}]' THEN 2
        WHEN states @> '[{"country_code":"${country_code || ""}"}]' THEN 1
        ELSE 0
      END) DESC
    `);

    // -------------------------------
    // 7️⃣ Fetch Promotions
    // -------------------------------
    const { rows: promotions, count } = await Promotion.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "categories", "businessAddress"],
          required: false, // 🔥 VERY IMPORTANT (LEFT JOIN)
        },
      ],
      order: [orderPriority, ["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    // -------------------------------
    // 8️⃣ Response
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
