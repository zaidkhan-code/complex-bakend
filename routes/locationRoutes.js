const express = require("express");
const geoip = require("geoip-lite");

const router = express.Router();

router.get("/", (req, res) => {
  let { city, state, lat, lon } = req.query;

  // Parse lat/lon properly
  lat = lat ? Number(lat) : null;
  lon = lon ? Number(lon) : null;

  // Get client IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress;

  let geo = null;

  // If frontend did NOT send location → try IP-based lookup
  if (!city && !state && (lat === null || lon === null)) {
    geo = geoip.lookup(ip);

    if (geo) {
      city = geo.city || null;
      state = geo.region || null;

      if (lat === null && geo.ll) lat = geo.ll[0];
      if (lon === null && geo.ll) lon = geo.ll[1];
    }
  } else {
    // Even if frontend sends data, still try IP geo for reference
    geo = geoip.lookup(ip);
  }

  res.json({
    ip,
    city: city ?? "Unknown",
    state: state ?? "Unknown",
    lat: typeof lat === "number" && !isNaN(lat) ? lat : null,
    lon: typeof lon === "number" && !isNaN(lon) ? lon : null,
    geo, // complete geo object from geoip-lite
  });
});

module.exports = router;
