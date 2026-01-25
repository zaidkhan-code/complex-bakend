const express = require("express");
const router = express.Router();
const { handleWebhook } = require("../controllers/paymentController");
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);
module.exports = router;
