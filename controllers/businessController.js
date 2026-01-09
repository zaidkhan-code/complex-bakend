const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const stripe = require("../config/stripe");
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

    console.log(
      `✅ [CREATE PROMOTION] Promotion created - ID: ${promotion.id}, Price: ${promotion.price}`
    );

    // Format promotion details for Stripe description
    const statesList =
      states && states.length > 0
        ? states.map((s) => `${s.name || s.code} (${s.code})`).join(", ")
        : "No states selected";

    const citiesList =
      cities && cities.length > 0
        ? cities.map((c) => c.name).join(", ")
        : "No cities selected";

    const timezonesList =
      timezones && timezones.length > 0
        ? timezones.join(", ")
        : "No timezones selected";

    const promotionDescription = `
Promotion Details:
States: ${statesList}
 Cities: ${citiesList}
 Timezones: ${timezonesList}
 Date: ${promotion.runDate} to ${promotion.stopDate}
 Time: ${promotion.runTime} to ${promotion.stopTime}
Price: $${promotion.price}
    `.trim();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Promotion Service",
              description: promotionDescription,
            },
            unit_amount: Math.round(promotion.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/business/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/business/promotions?payment_canceled=true&promotion_id=${promotion.id}`,
      metadata: {
        promotionId: promotion.id,
        businessId: req.business.id,
        category: promotion.category,
        states: JSON.stringify(states),
        cities: JSON.stringify(cities),
        timezones: JSON.stringify(timezones),
        runDate: promotion.runDate,
        stopDate: promotion.stopDate,
        runTime: promotion.runTime,
        stopTime: promotion.stopTime,
      },
    });

    console.log(
      `✅ [CREATE PROMOTION] Stripe session created - Session ID: ${session.id}`
    );

    // Return promotion data with Stripe session info
    res.status(201).json({
      promotion,
      stripeSession: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error(`❌ [CREATE PROMOTION] Error:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all business promotions
// @route   GET /api/business/promotions
// @access  Private (Business)
const getBusinessPromotions = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    // Build where clause with search filter
    const whereClause = {
      businessId: req.business.id,
    };

    // If status query is provided, filter by status
    if (status.trim()) {
      const validStatuses = ["active", "inactive", "pending"];
      if (validStatuses.includes(status.toLowerCase())) {
        whereClause.status = status.toLowerCase();
      }
    }

    // If search query is provided, filter by category
    if (search.trim()) {
      whereClause[Op.or] = [
        {
          category: {
            [Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    const promotions = await Promotion.findAll({
      where: whereClause,
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

    // Generate chart data for last 7 days (daily breakdown)
    const last7DaysChartData = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const date = new Date(last7Days.startDate);
      date.setDate(date.getDate() + i);

      const dayStats = await Promotion.findAll({
        where: {
          businessId,
          createdAt: {
            [Op.gte]: new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate()
            ),
            [Op.lt]: new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate() + 1
            ),
          },
        },
        attributes: [
          [
            Promotion.sequelize.fn("SUM", Promotion.sequelize.col("views")),
            "views",
          ],
        ],
        raw: true,
      });

      last7DaysChartData.push({
        day: days[date.getDay()],
        views: dayStats[0]?.views || 0,
      });
    }

    // Generate chart data for last 30 days (weekly breakdown)
    const last30DaysChartData = [];
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(lastMonth.startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekStats = await Promotion.findAll({
        where: {
          businessId,
          createdAt: {
            [Op.gte]: weekStart,
            [Op.lt]: weekEnd,
          },
        },
        attributes: [
          [
            Promotion.sequelize.fn("SUM", Promotion.sequelize.col("views")),
            "views",
          ],
        ],
        raw: true,
      });

      last30DaysChartData.push({
        week: `Week ${week + 1}`,
        views: weekStats[0]?.views || 0,
      });
    }

    // Calculate momentum score based on recent activity
    const momentum = {
      score: calculateMomentumScore(
        last7DaysStats[0]?.totalViews || 0,
        activePromotions
      ),
      level: getMomentumLevel(
        calculateMomentumScore(
          last7DaysStats[0]?.totalViews || 0,
          activePromotions
        )
      ),
      message: "Keep running promotions frequently to maintain high momentum",
    };

    res.json({
      last7Days: last7DaysStats[0],
      lastMonth: lastMonthStats[0],
      overall: overallStats[0],
      activePromotions,
      chartData: {
        last7Days: last7DaysChartData,
        last30Days: last30DaysChartData,
        momentum,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to calculate momentum score
const calculateMomentumScore = (views, activePromotions) => {
  const baseScore = Math.min(views / 10, 50); // Max 50 from views
  const promoBonus = activePromotions * 10; // 10 points per active promotion
  return Math.min(baseScore + promoBonus, 100);
};

// Helper function to get momentum level
const getMomentumLevel = (score) => {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

module.exports = {
  createPromotion,
  getBusinessPromotions,
  updatePromotion,
  deletePromotion,
  getDashboard,
};
