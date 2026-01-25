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

const createPromotion = async (req, res) => {
  try {
    const business = await Business.findByPk(req.business.id);
    if (!business)
      return res.status(404).json({ message: "Business not found" });

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
      // price may be provided by frontend but we recalc
    } = req.body;

    // Validate subscription
    if (
      !business.subscriptionStart ||
      !business.subscriptionEnd ||
      business.subscriptionStatus !== "active"
    ) {
      return res.status(403).json({
        message: "You need an active subscription to create promotions.",
      });
    }
    const subStart = new Date(business.subscriptionStart);
    const subEnd = new Date(business.subscriptionEnd);
    const run = new Date(runDate);
    const stop = new Date(stopDate);
    if (run < subStart || stop > subEnd) {
      return res.status(400).json({
        message: `Promotion dates must be within your subscription period (${subStart.toISOString().split("T")[0]} → ${subEnd.toISOString().split("T")[0]})`,
      });
    }

    // Pricing logic (match front-end)
    const isOnlineStore = business.businessType === "online-ecommerce";
    const hasEasternTimezone = timezones.some((tz) =>
      tz.toLowerCase().includes("eastern"),
    );
    let baseCost = 0;
    let stateCost = 0;
    let timezoneCost = 0;

    if (isOnlineStore) {
      baseCost = 0; // subscription replaces baseCost for online store
      // states: first one included? In your front-end online used base 10 includes 1 state;
      // for subscription we choose: states charge as before EXCEPT base replaced by subscription.
      if (states.length > 1) {
        stateCost = (states.length - 1) * 10;
      }
      if (timezones.length > 0) {
        if (hasEasternTimezone) {
          const nonEasternCount = timezones.filter(
            (tz) => !tz.toLowerCase().includes("eastern"),
          ).length;
          timezoneCost = nonEasternCount * 30 + 50;
        } else {
          timezoneCost = timezones.length * 30;
        }
      }
    } else {
      // Physical location pricing: states charged as before
      if (states.length > 0) {
        stateCost = states.length * 20;
        baseCost = 0; // subscription replaces per-promotion base cost
      } else {
        baseCost = 0; // subscription replaces starter charge
      }
      if (timezones.length > 0) {
        if (hasEasternTimezone) {
          const nonEasternCount = timezones.filter(
            (tz) => !tz.toLowerCase().includes("eastern"),
          ).length;
          timezoneCost = nonEasternCount * 60 + 100;
        } else {
          timezoneCost = timezones.length * 60;
        }
      }
    }

    // IMPORTANT: Cities are free up to 2 per promotion (no cost)
    // (no city cost is added)

    const subtotal = baseCost + stateCost + timezoneCost;
    const totalPrice = subtotal; // subscription months already paid separately

    // Create Promotion record (status pending until invoice paid)
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
      calculatedMonths: 1, // keep but not heavily used here
      price: totalPrice,
      status: totalPrice > 0 ? "pending" : "inactive",
      autoApprove: business.autoApprovePromotions || false,
      paymentStatus: totalPrice > 0 ? "pending" : "completed",
    });

    let invoice = null;
    // If there is an add-on cost, create invoice items and finalize invoice to charge immediately
    if (totalPrice > 0) {
      if (!business.stripeCustomerId) {
        // Create stripe customer if missing
        const customer = await stripe.customers.create({
          email: business.email,
          name: business.name,
          metadata: { businessId: business.id },
        });
        business.stripeCustomerId = customer.id;
        await business.save();
      }

      // Create invoice item for the add-on cost (in cents)
      const description = `Promotion add-ons: states ${states.length}, timezones ${timezones.length} (Promotion ${promotion.id})`;
      await stripe.invoiceItems.create({
        customer: business.stripeCustomerId,
        amount: Math.round(totalPrice * 100),
        currency: "usd",
        description,
        metadata: { promotionId: promotion.id, businessId: business.id },
      });

      // Create and pay the invoice immediately
      invoice = await stripe.invoices.create({
        customer: business.stripeCustomerId,
        auto_advance: true, // auto-finalize
        metadata: { promotionId: promotion.id, businessId: business.id },
      });

      // Pay invoice (this charges the customer's default payment method)
      const paidInvoice = await stripe.invoices.pay(invoice.id);
      if (paidInvoice.status === "paid") {
        promotion.status = "active";
        promotion.paymentStatus = "completed";
        await promotion.save();
      } else {
        promotion.status = "pending";
        promotion.paymentStatus = "pending";
        await promotion.save();
      }
    }

    // Return promotion + invoice info (if any)
    res.status(201).json({ promotion, invoice });
  } catch (error) {
    console.error("CREATE PROMOTION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPromotion };

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
