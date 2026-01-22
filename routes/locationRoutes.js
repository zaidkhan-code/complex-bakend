const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Get client IP (proxy safe)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    // If localhost or private IP, third-party APIs may fail
    // You can still send response
    const ipwhoPromise = fetch(`https://ipwho.is/${ip}`)
      .then((r) => r.json())
      .catch(() => ({ error: "ipwho.is failed" }));

    const iplocalizePromise = fetch(
      `https://iplocalize.com/api/v1/lookup/${ip}`,
    )
      .then((r) => r.json())
      .catch(() => ({ error: "iplocalize failed" }));

    // Run both requests in parallel
    const [ipwho, iplocalize] = await Promise.all([
      ipwhoPromise,
      iplocalizePromise,
    ]);

    // ✅ SEND DIRECT RAW RESPONSE TO FRONTEND
    return res.json({
      ip,
      ipwho, // FULL ipwho.is response
      iplocalize, // FULL iplocalize.com response
    });
  } catch (error) {
    return res.status(500).json({
      error: "Location detection failed",
      message: error.message,
    });
  }
});
module.exports = router;
