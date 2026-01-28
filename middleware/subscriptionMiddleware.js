const BusinessSubscription = require("../models/BusinessSubscription");

const requireActiveSubscription = async (req, res, next) => {
  try {
    const subscription = await BusinessSubscription.findOne({
      where: {
        businessId: req.business.id,
        status: "active",
      },
    });

    if (!subscription) {
      return res.status(403).json({
        message: "Active subscription required",
      });
    }

    // Extra safety: expiry check
    if (new Date(subscription.endDate) < new Date()) {
      subscription.status = "expired";
      await subscription.save();

      return res.status(403).json({
        message: "Your subscription has expired",
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
