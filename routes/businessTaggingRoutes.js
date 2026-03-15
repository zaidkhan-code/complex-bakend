const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createBusinessTagging,
  listMyBusinessTaggings,
  deleteBusinessTagging,
  getReceivedTaggingSummary,
  listReceivedTaggers,
} = require("../controllers/businessTaggingController");

// Allow both user and business accounts
router.use(protect());

// Tagging (created by current account)
router.post("/", createBusinessTagging);
router.get("/mine", listMyBusinessTaggings);
router.delete("/:id", deleteBusinessTagging);

// Received tagging (business only)
router.get("/received/summary", getReceivedTaggingSummary);
router.get("/received/taggers", listReceivedTaggers);

module.exports = router;

