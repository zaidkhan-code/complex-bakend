const express = require("express");
const router = express.Router();
const {
  createTemplate,
  getAllTemplates,
  deleteTemplate,
} = require("../controllers/SubscriptionTemplate");
const { protect } = require("../middleware/authMiddleware");

// ADMIN
router.post("/", protect("admin"), createTemplate);
router.delete("/:id", protect("admin"), deleteTemplate);

// PUBLIC / BUSINESS
router.get("/", getAllTemplates);

module.exports = router;
