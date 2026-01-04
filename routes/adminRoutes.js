const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  getAllUsers,
  getAllBusinesses,
  toggleUserBlock,
  toggleBusinessBlock,
  getAllPromotions,
  deletePromotion,
  getAdminDashboard,
  uploadTemplateImage,
  getAllTemplates,
  deleteTemplate,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// router.use(protect);
// router.use(adminOnly);

router.get("/dashboard", getAdminDashboard);
router.get("/users", getAllUsers);
router.get("/businesses", getAllBusinesses);
router.put("/users/:id/block", toggleUserBlock);
router.put("/businesses/:id/block", toggleBusinessBlock);
router.get("/promotions", getAllPromotions);
router.delete("/promotions/:id", deletePromotion);

// Template routes
router.post("/templates/upload", upload.single("image"), uploadTemplateImage);
router.get("/templates", getAllTemplates);
router.delete("/templates/:id", deleteTemplate);

module.exports = router;
