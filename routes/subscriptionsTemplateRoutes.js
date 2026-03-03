const express = require("express");
const router = express.Router();
const {
  createTemplate,
  updateTemplate,
  getAllTemplates,
  deleteTemplate,
} = require("../controllers/SubscriptionTemplate");
const { protect } = require("../middleware/authMiddleware");

// ADMIN
router.post("/", protect("admin"), createTemplate);
router.put("/:id", protect("admin"), updateTemplate);
router.delete("/:id", protect("admin"), deleteTemplate);

// PUBLIC / BUSINESS
router.get("/", getAllTemplates);

module.exports = router;
