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
    const { city, state, timezone, category } = req.query;

    const where = {
      status: "active",
    };

    if (category) {
      where.category = category;
    }

    // Build priority scoring
    // City exact match gets highest score → 3
    // State code exact match → 2
    // Timezone match → 1
    const orderPriority = literal(`
      (CASE
        WHEN cities @> '[{"state_code":"${state}"}]' THEN 2
        WHEN timezones @> '["${timezone}"]' THEN 1
        ELSE 0
      END) DESC
    `);

    // Combined where with fallback: city OR state OR timezone
    const promotions = await Promotion.findAll({
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
        },
      ],
      order: [orderPriority, ["createdAt", "DESC"]],
    });

    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
