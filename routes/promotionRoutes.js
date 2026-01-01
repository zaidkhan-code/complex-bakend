const express = require("express");
const router = express.Router();
const {
  getPromotions,
  getPromotionById,
  calculatePromotionPrice,
  getTemplates,
  incrementClick,
} = require("../controllers/promotionController");

router.get("/", getPromotions);
router.get("/templates", getTemplates);
router.post("/calculate-price", calculatePromotionPrice);
router.get("/:id", getPromotionById);
router.post("/:id/click", incrementClick);
router.get("/location", (req, res) => {
  try {
    // Check if frontend sent lat/lon or city/state manually
    let { city, state, lat, lon } = req.query;

    // If not provided, fallback to IP geolocation
    if (!city && !state && (!lat || !lon)) {
      const ip = (req.headers["x-forwarded-for"] || req.ip || "")
        .split(",")[0]
        .trim();
      const geo = geoip.lookup(ip);
      if (geo) {
        city = geo.city || null;
        state = geo.region || null;
        if (!lat && geo.ll) lat = geo.ll[0];
        if (!lon && geo.ll) lon = geo.ll[1];
      }
    }

    res.json({
      city: city || "Unknown",
      state: state || "Unknown",
      lat: lat || null,
      lon: lon || null,
    });
  } catch (error) {
    console.error("Location API error:", error);
    res.status(500).json({ message: "Failed to detect location" });
  }
});

module.exports = router;
