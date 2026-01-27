const express = require("express");
const {
  createSubscriptionCheckout,
  getActiveSubscription,
  getSubscriptionHistory,
} = require("../controllers/subscribeBusiness");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();
router.use(protect("business"));
router.post("/checkout", createSubscriptionCheckout);
router.get("/active", getActiveSubscription);
router.get("/history", getSubscriptionHistory);
module.exports = router;
