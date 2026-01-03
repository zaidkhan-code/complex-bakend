const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { city, state, lat, lon } = req.query;

    lat = lat ? Number(lat) : null;
    lon = lon ? Number(lon) : null;

    // Get client IP
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    let geo = null;

    // If frontend didn't send location → use IP API
    if (!city && !state && (lat === null || lon === null)) {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      geo = await response.json();

      if (!geo.error) {
        city = geo.city || null;
        state = geo.region || null;
        lat = geo.latitude || null;
        lon = geo.longitude || null;
      }
    } else {
      // Still fetch geo for reference
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      geo = await response.json();
    }

    res.json({
      ip,
      city: city ?? "Unknown",
      state: state ?? "Unknown",
      lat,
      lon,
      geo, // FULL response from IP API
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to detect location",
      message: error.message,
    });
  }
});

module.exports = router;
