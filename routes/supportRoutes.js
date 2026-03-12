const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const { createSupportMessage } = require("../controllers/supportController");

const router = express.Router();

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/messages",
  supportLimiter,
  [
    body("senderType")
      .isIn(["customer", "business"])
      .withMessage("senderType must be customer or business"),
    body("name").isString().trim().isLength({ min: 2, max: 120 }),
    body("email").isEmail().normalizeEmail(),
    body("subject").isString().trim().isLength({ min: 2, max: 200 }),
    body("body").isString().trim().isLength({ min: 2, max: 5000 }),
  ],
  createSupportMessage,
);

module.exports = router;

