const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Get client IP (proxy safe)
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    // Fix localhost issue for development
    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "8.8.8.8"; // Google DNS (for testing)
    }

    // FREE third-party APIs (parallel requests)
    const ipwhoPromise = fetch(`https://ipwho.is/${ip}`)
      .then((r) => r.json())
      .catch(() => ({ error: "ipwho.is failed" }));

    const iplocalizePromise = fetch(
      `https://iplocalize.com/api/v1/lookup/${ip}`,
    )
      .then((r) => r.json())
      .catch(() => ({ error: "iplocalize failed" }));

    const ipapiPromise = fetch(`https://ipapi.co/${ip}/json/`)
      .then((r) => r.json())
      .catch(() => ({ error: "ipapi failed" }));

    const ipApiPromise = fetch(`http://ip-api.com/json/${ip}`)
      .then((r) => r.json())
      .catch(() => ({ error: "ip-api failed" }));

    const freeGeoIpPromise = fetch(`https://freegeoip.app/json/${ip}`)
      .then((r) => r.json())
      .catch(() => ({ error: "freegeoip failed" }));

    // Run all requests in parallel
    const [ipwho, iplocalize, ipapi, ipApi, freegeoip] = await Promise.all([
      ipwhoPromise,
      iplocalizePromise,
      ipapiPromise,
      ipApiPromise,
      freeGeoIpPromise,
    ]);

    // ✅ SEND RAW RESPONSES DIRECTLY TO FRONTEND
    return res.json({
      ip,
      ipwho, // ipwho.is response
      iplocalize, // iplocalize.com response
      ipapi, // ipapi.co response
      ipApi, // ip-api.com response
      freegeoip, // freegeoip.app response
    });
  } catch (error) {
    return res.status(500).json({
      error: "Location detection failed",
      message: error.message,
    });
  }
});
module.exports = router;
