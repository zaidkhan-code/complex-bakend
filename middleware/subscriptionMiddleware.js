const BusinessSubscription = require("../models/BusinessSubscription");
const {
  getValidActiveSubscription,
} = require("../utils/businessSubscriptionUtils");

const requireActiveSubscription = async (req, res, next) => {
  try {
    const subscription = await getValidActiveSubscription(req.business.id);
    if (!subscription) {
      return res.status(403).json({
        message: "Active subscription required",
      });
    }

    // Attach subscription to request (VERY useful)
    req.activeSubscription = subscription;

    next();
  } catch (error) {
    console.error("SUBSCRIPTION MIDDLEWARE ERROR:", error);
    res.status(500).json({ message: "Subscription check failed" });
  }
};

module.exports = { requireActiveSubscription };
