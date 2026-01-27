const express = require("express");
const router = express.Router();
const {
  createPromotion,
  getBusinessPromotions,
  updatePromotion,
  deletePromotion,
  getDashboard,
  activatePromotion,
  deactivatePromotion,
  getPromotionById,
} = require("../controllers/businessController");
const { protect } = require("../middleware/authMiddleware");
const { validatePromotion } = require("../middleware/validationMiddleware");
const {
  requireActiveSubscription,
} = require("../middleware/subscriptionMiddleware");

router.use(protect("business"));

router.get("/dashboard", getDashboard);
router.post(
  "/promotions",
  requireActiveSubscription,
  validatePromotion,
  createPromotion,
);
router.get("/promotions", getBusinessPromotions);
router.get("/promotions/:promotionId", getPromotionById);
router.put("/promotions/:id", updatePromotion);
router.delete("/promotions/:id", deletePromotion);
router.post("/promotions/:promotionId/activate", activatePromotion);
router.post("/promotions/:promotionId/deactivate", deactivatePromotion);

module.exports = router;
