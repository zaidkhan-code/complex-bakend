const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { city, state, lat, lon } = req.query;

    lat = lat ? Number(lat) : null;
    lon = lon ? Number(lon) : null;

    // Get client IP (proxy safe)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    let geo = null;

    // If frontend didn't send location → use IP lookup
    if (!city && !state && (lat === null || lon === null)) {
      const response = await fetch(`https://ipwho.is/${ip}`);
      const response1 = await fetch(
        `https://iplocalize.com/api/v1/lookup/${ip}`,
      );
      const data = await response.json();
      const data1 = await response1.json();
      geo = {
        data: data,
        data1: data1,
      };

      if (geo.success) {
        city = geo.city || null;
        state = geo.region || null;
        lat = geo.latitude || null;
        lon = geo.longitude || null;
      }
    } else {
      // Still fetch geo for reference
      const response = await fetch(`https://ipwho.is/${ip}`);
      geo = await response.json();
    }

    res.json({
      ip,
      city: city ?? "Unknown",
      state: state ?? "Unknown",
      lat,
      lon,
      geo, // full ipwho.is response
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to detect location",
      message: error.message,
    });
  }
});

module.exports = router;
