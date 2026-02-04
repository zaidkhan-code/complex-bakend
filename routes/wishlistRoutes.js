const express = require("express");
const router = express.Router();
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlistStatus,
  getWishlistStats,
  getPopularPromos,
  clearWishlist,
} = require("../controllers/wishlistController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.get("/popular", getPopularPromos);

// Private routes - require authentication
router.use(protect("user"));

// Get user/business wishlist
router.get("/", getWishlist);

// Check if promotion is in wishlist
router.get("/check/:promotionId", checkWishlistStatus);

// Add promotion to wishlist
router.post("/", addToWishlist);

// Remove promotion from wishlist
router.delete("/:promotionId", removeFromWishlist);

// Clear entire wishlist
router.delete("/clear-all", clearWishlist);

// Business statistics
router.get("/stats/business", getWishlistStats);

module.exports = router;
