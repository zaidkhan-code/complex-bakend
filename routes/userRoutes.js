const geoip = require("geoip-lite");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getUserProfile,
  updateUserProfile,
  searchBusiness,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// Multer memory storage (used for small profile uploads)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

router.use(protect("user"));
router.get("/profile", getUserProfile);
// Accept single file field named `avatar` for profile picture
router.put("/profile", upload.single("avatar"), updateUserProfile);
router.post("/wishlist", addToWishlist);
router.get("/wishlist", getWishlist);
router.get("/search-business", searchBusiness);
router.delete("/wishlist/:promotionId", removeFromWishlist);

// GET /api/location

module.exports = router;
