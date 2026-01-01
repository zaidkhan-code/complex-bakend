const express = require("express");
const geoip = require("geoip-lite");

const router = express.Router();

router.get("/", (req, res) => {
  let { city, state, lat, lon } = req.query;

  // Convert lat/lon to numbers if provided
  lat = lat ? Number(lat) : null;
  lon = lon ? Number(lon) : null;

  // If frontend did NOT send location → try IP-based lookup
  if (!city && !state && (lat === null || lon === null)) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip);

    if (geo) {
      city = geo.city || null;
      state = geo.region || null;

      if (lat === null && geo.ll) lat = geo.ll[0];
      if (lon === null && geo.ll) lon = geo.ll[1];
    }
  }

  res.json({
    city: city ?? "Unknown",
    state: state ?? "Unknown",
    lat: typeof lat === "number" ? lat : null,
    lon: typeof lon === "number" ? lon : null,
  });
});

module.exports = router;
