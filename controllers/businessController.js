const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const stripe = require("../config/stripe");
const { Op } = require("sequelize");
const { calculatePrice } = require("../utils/calculatePrice");
const {
  getDateRange,
  calculateMonthsFromDateRange,
} = require("../utils/dateUtils");
const createPromotion = async (req, res) => {
  try {
    const business = await Business.findByPk(req.business.id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // 👇 ACTIVE SUBSCRIPTION (from middleware)
    const subscription = req.activeSubscription;
    if (!subscription) {
      return res.status(403).json({
        message: "Active subscription required",
      });
    }

    const {
      templateId,
      imageUrl,
      text,
      backgroundColor,
      category,
      cities = [],
      states = [],
      timezones = [],
      runDate,
      stopDate,
      runTime,
      stopTime,
    } = req.body;

    /* ==========================================
       SUBSCRIPTION DATE VALIDATION
    ========================================== */
    const subStart = new Date(subscription.startDate);
    const subEnd = new Date(subscription.endDate);
    const run = new Date(runDate);
    const stop = new Date(stopDate);

    // if (run < subStart || stop > subEnd) {
    //   return res.status(400).json({
    //     message: `Promotion must run within subscription period (${
    //       subStart.toISOString().split("T")[0]
    //     } → ${subEnd.toISOString().split("T")[0]})`,
    //   });
    // }
    const freeStates = subscription.freeStates || 0;
    const freeTimezones = subscription.freeTimezones || 0;

    const extraStates = Math.max(0, states.length - freeStates);
    const extraTimezones = Math.max(0, timezones.length - freeTimezones);

    /* ==========================================
       PRICING LOGIC
    ========================================== */
    const isOnlineStore = business.businessType === "online-ecommerce";
    const hasEasternTimezone = timezones.some((tz) =>
      tz.toLowerCase().includes("eastern"),
    );

    let stateCost = 0;
    let timezoneCost = 0;

    // STATES
    if (extraStates > 0) {
      stateCost = isOnlineStore ? extraStates * 10 : extraStates * 20;
    }

    // TIMEZONES
    if (extraTimezones > 0) {
      if (hasEasternTimezone) {
        const nonEasternCount = timezones.filter(
          (tz) => !tz.toLowerCase().includes("eastern"),
        ).length;

        timezoneCost = isOnlineStore
          ? nonEasternCount * 30 + 50
          : nonEasternCount * 60 + 100;
      } else {
        timezoneCost = isOnlineStore
          ? extraTimezones * 30
          : extraTimezones * 60;
      }
    }

    // Cities are free (subscription-based, no cost)
    const totalPrice = stateCost + timezoneCost;

    /* ==========================================
       CREATE PROMOTION (PENDING IF PAID)
    ========================================== */
    const promotion = await Promotion.create({
      businessId: business.id,
      templateId,
      imageUrl,
      text: Array.isArray(text) ? text : text ? [text] : [],
      backgroundColor: backgroundColor || "",
      category: category || business.category,
      cities,
      states,
      timezones,
      runDate,
      stopDate,
      runTime,
      stopTime,
      calculatedMonths: 1,
      price: totalPrice,
      status:
        totalPrice > 0
          ? "pending"
          : business.autoApprovePromotions
            ? "inactive"
            : "pending",
      autoApprove: business.autoApprovePromotions || false,
      paymentStatus: totalPrice > 0 ? "pending" : "completed",
    });

    /* ==========================================
       STRIPE PAYMENT (ONLY IF PRICE > 0)
    ========================================== */
    if (totalPrice > 0) {
      if (!business.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: business.email,
          name: business.name,
          metadata: { businessId: business.id },
        });
        business.stripeCustomerId = customer.id;
        await business.save();
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100),
        currency: "usd",
        customer: business.stripeCustomerId,
        payment_method_types: ["card"],
        metadata: {
          promotionId: promotion.id,
          businessId: business.id,
        },
        // automatic_payment_methods: { enabled: true },
        description: `Promotion add-ons: ${extraStates} extra states, ${extraTimezones} extra timezones`,
      });

      return res.status(201).json({
        promotion,
        clientSecret: paymentIntent.client_secret,
        requiresPayment: true,
      });
    }

    /* ==========================================
       FREE PROMOTION
    ========================================== */
    return res.status(201).json({
      promotion,
      clientSecret: null,
      requiresPayment: false,
    });
  } catch (error) {
    console.error("CREATE PROMOTION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new promotion
// @route   POST /api/business/promotions
// @access  Private (Business)
// const createPromotion = async (req, res) => {
//   try {
//     const {
//       templateId,
//       imageUrl,
//       text,
//       backgroundColor,
//       category,
//       cities = [],
//       states = [],
//       timezones = [],
//       runDate,
//       stopDate,
//       runTime,
//       stopTime,
//       price, // Price calculated on frontend
//     } = req.body;

//     const promotion = await Promotion.create({
//       businessId: req.business.id,
//       templateId,
//       imageUrl,
//       text: text ? (Array.isArray(text) ? text : [text]) : [],
//       backgroundColor: backgroundColor || "",
//       category: category || req.business.category,
//       cities,
//       states,
//       timezones,
//       runDate,
//       stopDate,
//       runTime,
//       stopTime,
//       price,
//       status: "pending", // Will be activated after payment
//     });

//     console.log(
//       `✅ [CREATE PROMOTION] Promotion created - ID: ${promotion.id}, Price: ${promotion.price}`,
//     );

//     console.log(
//       `   Preparing Stripe checkout session...`,
//       cities,
//       states,
//       timezones,
//     );
//     const formatList = (items, formatter, emptyLabel) => {
//       if (!items || items.length === 0) return emptyLabel;
//       return items.map(formatter).join(", ");
//     };

//     const formatDate = (date) => new Date(date).toLocaleDateString("en-US");

//     const formatTime = (time) => time || "N/A";
//     // Format promotion details for Stripe description
//     const statesList = formatList(
//       states,
//       (s) => `${s.name || s.code} (${s.state_code})`,
//       "No states selected",
//     );

//     const citiesList = formatList(cities, (c) => c.name, "No cities selected");

//     const timezonesList = formatList(
//       timezones,
//       (tz) => tz,
//       "No timezones selected",
//     );

//     const promotionDescription = `
// Promotion Details
// States: ${statesList}
// Cities: ${citiesList}
// Timezones: ${timezonesList}
// Date: ${formatDate(promotion.runDate)} → ${formatDate(promotion.stopDate)}
// Time: ${formatTime(promotion.runTime)} → ${formatTime(promotion.stopTime)}
// Price: $${promotion.price}
// `.trim();

//     // Create Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: {
//               name: "Promotion Service",
//               description: promotionDescription,
//             },
//             unit_amount: Math.round(promotion.price * 100), // Convert to cents
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `${
//         process.env.FRONTEND_URL || "http://localhost:3000"
//       }/business/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${
//         process.env.FRONTEND_URL || "http://localhost:3000"
//       }/business/promotions?payment_canceled=true&promotion_id=${promotion.id}`,
//       metadata: {
//         promotionId: promotion.id,
//         businessId: req.business.id,
//         category: promotion.category,
//         runDate: promotion.runDate,
//         stopDate: promotion.stopDate,
//         runTime: promotion.runTime,
//         stopTime: promotion.stopTime,
//       },
//     });

//     console.log(
//       `✅ [CREATE PROMOTION] Stripe session created - Session ID: ${session.id}`,
//     );

//     // Return promotion data with Stripe session info
//     res.status(201).json({
//       promotion,
//       stripeSession: {
//         sessionId: session.id,
//         url: session.url,
//       },
//     });
//   } catch (error) {
//     console.error(`❌ [CREATE PROMOTION] Error:`, error.message);
//     res.status(500).json({ message: error.message });
//   }
// };
// controllers/promotionController.js

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

const getPromotionById = async (req, res) => {
  try {
    const { promotionId } = req.params; // get promotion ID from URL

    // Find promotion belonging to the logged-in business
    const promotion = await Promotion.findOne({
      where: {
        id: promotionId,
        businessId: req.business.id, // ensure it belongs to the business
      },
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.json(promotion); // return promotion data
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

    const { imageUrl, text, backgroundColor, runTime, stopTime } = req.body;

    // Allow editing: image, text (content & styling), background color, runTime, stopTime
    // Location, state, runDate, stopDate cannot be changed
    if (imageUrl) {
      promotion.imageUrl = imageUrl;
    }

    if (text) {
      promotion.text = Array.isArray(text) ? text : [text];
    }

    if (backgroundColor !== undefined) {
      promotion.backgroundColor = backgroundColor;
    }

    if (runTime) {
      promotion.runTime = runTime;
    }

    if (stopTime) {
      promotion.stopTime = stopTime;
    }

    await promotion.save();

    res.json({
      message: "Promotion updated successfully",
      promotion,
    });
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
const clamp = (value, max) => Math.min(value, max);

const getDashboard = async (req, res) => {
  try {
    const businessId = req.business.id;
    const now = new Date();

    // Date ranges
    const last7Days = new Date();
    last7Days.setDate(now.getDate() - 7);

    const last30Days = new Date();
    last30Days.setDate(now.getDate() - 30);

    // Counts
    const weeklyCount = await Promotion.count({
      where: { businessId, createdAt: { [Op.gte]: last7Days } },
    });

    const monthlyCount = await Promotion.count({
      where: { businessId, createdAt: { [Op.gte]: last30Days } },
    });

    const totalPromotions = await Promotion.count({ where: { businessId } });
    const activePromotions = await Promotion.count({
      where: { businessId, status: "active" },
    });

    let momentumScore = clamp(Math.floor((totalPromotions / 25) * 100), 100); // simple scaling
    let momentumLevel = "Low";
    if (momentumScore >= 70) momentumLevel = "High";
    else if (momentumScore >= 40) momentumLevel = "Medium";

    res.json({
      response: {
        stats: { totalPromotions, activePromotions },
        chartData: {
          weekly: weeklyCount,
          monthly: monthlyCount,
          momentum: {
            score: momentumScore,
            level: momentumLevel,
            message:
              momentumLevel === "High"
                ? "Excellent promotion consistency 🚀"
                : momentumLevel === "Medium"
                  ? "Keep up the momentum!"
                  : "Run promotions more frequently to improve momentum",
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const activatePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const promotion = await Promotion.findOne({
      where: { id: promotionId, businessId: req.business.id },
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    if (promotion.status === "pending") {
      return res.status(400).json({
        message:
          "Promotion is not approved yet. Please wait for admin approval or 24 hours.",
      });
    }

    // Deactivate any other active promotions
    await Promotion.update(
      { status: "inactive" },
      { where: { businessId: req.business.id, status: "active" } },
    );

    // Activate this promotion
    promotion.status = "active";
    await promotion.save();

    res.json({
      message: "Promotion activated successfully",
      promotion,
    });
  } catch (error) {
    console.error("Error activating promotion:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================
// BUSINESS: Deactivate Promotion
// ======================
const deactivatePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    // Find promotion for this business
    const promotion = await Promotion.findOne({
      where: { id: promotionId, businessId: req.business.id },
    });

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    if (promotion.status === "pending") {
      return res.status(400).json({
        message: "Pending promotion cannot be deactivated. Approve it first.",
      });
    }

    if (promotion.status === "expired") {
      return res.status(400).json({
        message: "Expired promotion cannot be deactivated.",
      });
    }

    // Deactivate promotion
    promotion.status = "inactive";
    await promotion.save();

    res.json({
      message: "Promotion successfully deactivated",
      promotion: {
        id: promotion.id,
        businessId: promotion.businessId,
        status: promotion.status,
        runDate: promotion.runDate,
        stopDate: promotion.stopDate,
        approvedAt: promotion.approvedAt,
        createdAt: promotion.createdAt,
      },
    });
  } catch (error) {
    console.error("Error deactivating promotion:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

module.exports = {
  createPromotion,
  activatePromotion,
  deactivatePromotion,
  getBusinessPromotions,
  updatePromotion,
  deletePromotion,
  getPromotionById,
  getDashboard,
};
