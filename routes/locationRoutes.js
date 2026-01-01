const express = require("express");
const router = express.Router();
const geoip = require("geoip-lite");

router.get("/", (req, res) => {
  let { city, state, lat, lon } = req.query;

  if (!city && !state && (!lat || !lon)) {
    const ip = (req.headers["x-forwarded-for"] || req.ip || "")
      .split(",")[0]
      .trim();
    const geo = geoip.lookup(ip);
    if (geo) {
      city = geo.city || null;
      state = geo.region || null;
      if (!lat && geo.ll) lat = geo.ll[0];
      if (!lon && geo.ll) lon = geo.ll[1];
    }
  }

  res.json({
    city: city || "Unknown",
    state: state || "Unknown",
    lat: lat || null,
    lon: lon || null,
  });
});

module.exports = router;
