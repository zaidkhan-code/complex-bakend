const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const { Op } = require("sequelize");
const { calculatePrice } = require("../utils/calculatePrice");
const {
  getDateRange,
  calculateMonthsFromDateRange,
} = require("../utils/dateUtils");

// @desc    Create new promotion
// @route   POST /api/business/promotions
// @access  Private (Business)
const createPromotion = async (req, res) => {
  try {
    const {
      templateId,
      imageUrl,
      text,
      category,
      cities = [],
      states = [],
      timezones = [],
      runDate,
      stopDate,
      runTime,
      stopTime,
      price, // Price calculated on frontend
    } = req.body;

    const promotion = await Promotion.create({
      businessId: req.business.id,
      templateId,
      imageUrl,
      text: text ? text : "",
      category: category || req.business.category,
      cities,
      states,
      timezones,
      runDate,
      stopDate,
      runTime,
      stopTime,
      price,
      status: "pending", // Will be activated after payment
    });

    res.status(201).json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all business promotions
// @route   GET /api/business/promotions
// @access  Private (Business)
const getBusinessPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      where: { businessId: req.business.id },
      order: [["createdAt", "DESC"]],
    });

    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update promotion
// @route   PUT /api/business/promotions/:id
// @access  Private (Business)
const updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findOne({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    const {
      imageUrl,
      text,
      category,
      city,
      state,
      runDate,
      stopDate,
      runTime,
      stopTime,
      month,
      timezone,
    } = req.body;

    // Recalculate price if dates changed
    let newPrice = promotion.price;
    if (runDate || stopDate || runTime || stopTime || month) {
      newPrice = calculatePrice({
        runDate: runDate || promotion.runDate,
        stopDate: stopDate || promotion.stopDate,
        runTime: runTime || promotion.runTime,
        stopTime: stopTime || promotion.stopTime,
        month: month || promotion.month,
      });
    }

    // Update fields
    if (imageUrl) promotion.imageUrl = imageUrl;
    if (text) promotion.text = text;
    if (category) promotion.category = category;
    if (city) promotion.city = city;
    if (state) promotion.state = state;
    if (runDate) promotion.runDate = runDate;
    if (stopDate) promotion.stopDate = stopDate;
    if (runTime) promotion.runTime = runTime;
    if (stopTime) promotion.stopTime = stopTime;
    if (month) promotion.month = month;
    if (timezone) promotion.timezone = timezone;
    promotion.price = newPrice;

    await promotion.save();

    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete promotion
// @route   DELETE /api/business/promotions/:id
// @access  Private (Business)
const deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findOne({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    await promotion.destroy();

    res.json({ message: "Promotion deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get business dashboard statistics
// @route   GET /api/business/dashboard
// @access  Private (Business)
const getDashboard = async (req, res) => {
  try {
    const businessId = req.business.id;

    // Get date ranges
    const last7Days = getDateRange("week");
    const lastMonth = getDateRange("month");

    // Last 7 days stats
    const last7DaysStats = await Promotion.findAll({
      where: {
        businessId,
        createdAt: {
          [Op.gte]: last7Days.startDate,
        },
      },
      attributes: [
        [
          Promotion.sequelize.fn("COUNT", Promotion.sequelize.col("id")),
          "total",
        ],
        [
          Promotion.sequelize.fn("SUM", Promotion.sequelize.col("views")),
          "totalViews",
        ],
        [
          Promotion.sequelize.fn("SUM", Promotion.sequelize.col("clicks")),
          "totalClicks",
        ],
      ],
      raw: true,
    });

    // Last month stats
    const lastMonthStats = await Promotion.findAll({
      where: {
        businessId,
        createdAt: {
          [Op.gte]: lastMonth.startDate,
        },
      },
      attributes: [
        [
          Promotion.sequelize.fn("COUNT", Promotion.sequelize.col("id")),
          "total",
        ],
        [
          Promotion.sequelize.fn("SUM", Promotion.sequelize.col("views")),
          "totalViews",
        ],
        [
          Promotion.sequelize.fn("SUM", Promotion.sequelize.col("clicks")),
          "totalClicks",
        ],
      ],
      raw: true,
    });

    // Overall stats
    const overallStats = await Promotion.findAll({
      where: { businessId },
      attributes: [
        [
          Promotion.sequelize.fn("COUNT", Promotion.sequelize.col("id")),
          "total",
        ],
        [
          Promotion.sequelize.fn("SUM", Promotion.sequelize.col("views")),
          "totalViews",
        ],
        [
          Promotion.sequelize.fn("SUM", Promotion.sequelize.col("clicks")),
          "totalClicks",
        ],
      ],
      raw: true,
    });

    // Active promotions
    const activePromotions = await Promotion.count({
      where: {
        businessId,
        status: "active",
      },
    });

    res.json({
      last7Days: last7DaysStats[0],
      lastMonth: lastMonthStats[0],
      overall: overallStats[0],
      activePromotions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPromotion,
  getBusinessPromotions,
  updatePromotion,
  deletePromotion,
  getDashboard,
};
