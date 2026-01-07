const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const Template = require("../models/Template");
const { Op } = require("sequelize");
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
    const { location, category, state, city, timezone } = req.query;

    const where = {
      status: "active",
    };

    if (category) {
      where.category = category;
    }

    // For JSONB arrays, use contains operator to find promotions that target the provided values
    if (state) {
      where.states = { [Op.contains]: [state] };
    }

    if (city) {
      where.cities = { [Op.contains]: [city] };
    }

    if (timezone) {
      where.timezones = { [Op.contains]: [timezone] };
    }

    const promotions = await Promotion.findAll({
      where,
      include: [
        {
          model: Business,
          as: "business",
          attributes: ["name", "category"],
        },
      ],
      order: [["createdAt", "DESC"]],
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
      where: { isDefault: true },
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
