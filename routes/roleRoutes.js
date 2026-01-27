const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/roleMiddleware");
const {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
  getPermission,
} = require("../controllers/roleController");

/* ---------- ROUTES ---------- */

// Get all available permissions (no auth required for frontend)
router.get("/permissions", getPermission);

// Get all roles
router.get("/", protect("admin"), checkPermission("roles", "view"), getRoles);

// Create a new role
router.post(
  "/",
  protect("admin"),
  checkPermission("roles", "create"),
  createRole,
);

// Update a role
router.put(
  "/:id",
  protect("admin"),
  checkPermission("roles", "edit"),
  updateRole,
);

// Delete a role
router.delete(
  "/:id",
  protect("admin"),
  checkPermission("roles", "delete"),
  deleteRole,
);

module.exports = router;
