const Business  = require("../models/Business");

const requireActiveSubscription = async (req, res, next) => {
  try {
    const business = await Business.findByPk(req.business.id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (
      business.subscriptionStatus !== "active" ||
      !business.subscriptionStart ||
      !business.subscriptionEnd
    ) {
      return res.status(403).json({
        message: "Active subscription required",
      });
    }

    // Check expiry (extra safety)
    if (new Date(business.subscriptionEnd) < new Date()) {
      business.subscriptionStatus = "expired";
      await business.save();

      return res.status(403).json({
        message: "Your subscription has expired",
      });
    }

    next();
  } catch (error) {
    console.error("SUBSCRIPTION MIDDLEWARE ERROR:", error);
    res.status(500).json({ message: "Subscription check failed" });
  }
};

module.exports = { requireActiveSubscription };
