const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getAllUsers,
  getAllBusinesses,
  updateUserStatus,
  updateBusinessStatus,
  getAllPromotions,
  deletePromotion,
  changePromotionStatus,
  toggleBusinessAutoApprove,
  createPromotionForBusiness,
  getAdminDashboard,
  uploadTemplateImage,
  getAllTemplates,
  updateAdminRole,
  makeAdmin,
  runPromotion,
  deleteTemplate,
  createAdminUser,
  getUserPermissions,
} = require("../controllers/adminController");

const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/roleMiddleware");

// ---------------- MULTER ----------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ---------------- MIDDLEWARE ----------------
router.use(protect("admin"));
// router.use(adminOnly);

// ---------------- DASHBOARD ----------------
router.get(
  "/dashboard",
  checkPermission("dashboard", "view"),
  getAdminDashboard,
);

// ---------------- USERS ----------------
router.get("/users", checkPermission("users", "view"), getAllUsers);

router.put(
  "/users/:id/status",
  checkPermission("users", "edit"),
  updateUserStatus,
);

// ---------------- BUSINESSES ----------------
router.get(
  "/businesses",
  checkPermission("businesses", "view"),
  getAllBusinesses,
);

router.put(
  "/businesses/:id/status",
  checkPermission("businesses", "edit"),
  updateBusinessStatus,
);

// 🔥 Business auto-approve promotions
router.put(
  "/businesses/:businessId/toggle-auto-approve",
  checkPermission("businesses", "auto_approve"),
  toggleBusinessAutoApprove,
);

// ---------------- PROMOTIONS ----------------
router.get(
  "/promotions",
  checkPermission("promotions", "view"),
  getAllPromotions,
);

router.delete(
  "/promotions/:id",
  checkPermission("promotions", "delete"),
  deletePromotion,
);

// approve / change promotion status
router.put(
  "/promotions/:promotionId/status",
  checkPermission("promotions", "approve"),
  changePromotionStatus,
);

// Run a promotion (activate for its business and deactivate others)
router.post(
  "/promotions/:promotionId/run",
  checkPermission("promotions", "approve"),
  runPromotion,
);

// Get single promotion
router.get(
  "/promotions/:id",
  checkPermission("promotions", "view"),
  (req, res, next) =>
    require("../controllers/adminController").getPromotionById(req, res, next),
);

// Update promotion
router.put(
  "/promotions/:id",
  checkPermission("promotions", "edit"),
  (req, res, next) =>
    require("../controllers/adminController").updatePromotion(req, res, next),
);

// Create promotion for any business (admin)
router.post(
  "/promotions",
  checkPermission("promotions", "create"),
  createPromotionForBusiness,
);

// ---------------- TEMPLATES ----------------
router.post(
  "/templates/upload",
  checkPermission("templates", "create"),
  upload.array("images", 10),
  uploadTemplateImage,
);

router.get("/templates", checkPermission("templates", "view"), getAllTemplates);

router.delete(
  "/templates/:id",
  checkPermission("templates", "delete"),
  deleteTemplate,
);

// ---------------- ADMIN MANAGEMENT ----------------
router.post("/make-admin", checkPermission("roles", "edit"), makeAdmin);

router.put(
  "/admin/:id/role",
  checkPermission("roles", "edit"),
  updateAdminRole,
);

router.post(
  "/create-admin",
  checkPermission("roles", "create"),
  createAdminUser,
);

// ---------------- USER PERMISSIONS ----------------
router.get(
  "/user-permissions/:userId",
  checkPermission("roles", "view"),
  getUserPermissions,
);

module.exports = router;
