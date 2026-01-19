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
router.get("/", protect, checkPermission("roles", "view"), getRoles);

// Create a new role
router.post("/", protect, checkPermission("roles", "create"), createRole);

// Update a role
router.put("/:id", protect, checkPermission("roles", "edit"), updateRole);

// Delete a role
router.delete("/:id", protect, checkPermission("roles", "delete"), deleteRole);

module.exports = router;
