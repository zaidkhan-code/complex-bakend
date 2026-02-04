const geoip = require("geoip-lite");
const express = require("express");
const router = express.Router();
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getUserProfile,
  updateUserProfile,
  searchBusiness,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
router.use(protect("user"));
router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);
router.post("/wishlist", addToWishlist);
router.get("/wishlist", getWishlist);
router.get("/search-business", searchBusiness);
router.delete("/wishlist/:promotionId", removeFromWishlist);

// GET /api/location

module.exports = router;
