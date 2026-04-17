const express = require("express");

const { getPublicPhotos } = require("../controllers/photoController");

const router = express.Router();

router.get("/", getPublicPhotos);

module.exports = router;
