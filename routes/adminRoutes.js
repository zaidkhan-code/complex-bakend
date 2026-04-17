const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getAllUsers,
  getAllBusinesses,
  exportBusinessesCsv,
  updateUserStatus,
  updateBusinessStatus,
  grantBusinessSubscription,
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
const {
  getAdminPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto,
} = require("../controllers/photoController");

const {
  listSupportMessages,
  exportSupportMessagesCsv,
} = require("../controllers/supportAdminController");

const {
  listBusinessTaggersForAdmin,
  listBusinessTaggingsForAdmin,
  listTaggedBusinessesForAdmin,
  getTaggedBusinessDetailsForAdmin,
} = require("../controllers/businessTaggingAdminController");

const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/roleMiddleware");

// ---------------- MULTER ----------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for photos
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

// ---------------- SUPPORT MESSAGES ----------------
router.get(
  "/support-messages",
  checkPermission("support_messages", "view"),
  listSupportMessages,
);
router.get(
  "/support-messages/export",
  checkPermission("support_messages", "export"),
  exportSupportMessagesCsv,
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
router.get(
  "/businesses/export",
  checkPermission("businesses", "view"),
  exportBusinessesCsv,
);

router.put(
  "/businesses/:id/status",
  checkPermission("businesses", "edit"),
  updateBusinessStatus,
);

// 🔥 Business auto-approve promotions
router.post(
  "/businesses/:id/subscription",
  checkPermission("businesses", "edit"),
  grantBusinessSubscription,
);

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

// Create promotion directly as admin (no business selection)
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

// ---------------- PHOTOS ----------------
router.get("/photos", checkPermission("photos", "view"), getAdminPhotos);
router.post(
  "/photos",
  checkPermission("photos", "create"),
  upload.single("image"),
  createPhoto,
);
router.put(
  "/photos/:id",
  checkPermission("photos", "edit"),
  upload.single("image"),
  updatePhoto,
);
router.delete(
  "/photos/:id",
  checkPermission("photos", "delete"),
  deletePhoto,
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

// ---------------- BUSINESS TAGGING ----------------
router.get(
  "/business-tagging/taggers",
  checkPermission("business_tagging", "view"),
  listBusinessTaggersForAdmin,
);

router.get(
  "/business-tagging/taggings",
  checkPermission("business_tagging", "view"),
  listBusinessTaggingsForAdmin,
);
router.get(
  "/business-tagging/businesses",
  checkPermission("business_tagging", "view"),
  listTaggedBusinessesForAdmin,
);
router.get(
  "/business-tagging/business-details",
  checkPermission("business_tagging", "view"),
  getTaggedBusinessDetailsForAdmin,
);

module.exports = router;
