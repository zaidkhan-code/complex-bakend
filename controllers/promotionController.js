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
    const {
      city,
      state,
      timezone,
      category, // array of business categories from frontend
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {
      status: "active",
    };

    const orderPriority = literal(`
      (CASE
        WHEN cities @> '[{"name":"${city}"}]' THEN 3
        WHEN states @> '[{"state_code":"${state}"}]' THEN 2
        WHEN timezones @> '["${timezone}"]' THEN 1
        ELSE 0
      END) DESC
    `);

    /* ======================================================
       ✅ FETCH PROMOTIONS
       Business category filter works with JSONB now
    ====================================================== */
    const businessCategoryFilter =
      category && Array.isArray(category)
        ? category
        : category
          ? category.split(",").map((c) => c.trim())
          : null;

    const { rows: promotions, count } = await Promotion.findAndCountAll({
      where: {
        ...where,
        [Op.or]: [
          city && { cities: { [Op.contains]: [{ name: city }] } },
          state && { states: { [Op.contains]: [{ state_code: state }] } },
          timezone && { timezones: { [Op.contains]: [timezone] } },
        ].filter(Boolean),
      },
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "categories", "businessAddress"],
          where: businessCategoryFilter
            ? literal(`
              "business"."categories" ?| array[${businessCategoryFilter
                .map((c) => `'${c}'`)
                .join(",")}]
            `)
            : undefined,
        },
      ],
      order: [orderPriority, ["createdAt", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
      distinct: true,
    });

    res.json({
      success: true,
      total: count,
      page: Number(page),
      limit: Number(limit),
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
