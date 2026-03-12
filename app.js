const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { setupRoutes, setupModelRelationships } = require("./routes/index");

// Initialize app
const app = express();

// Security middleware
app.use(helmet());

const defaultOrigins = [
  "https://complisk.vercel.app",
  "https://complisk-codex-utpn.vercel.app",
  "https://complisk.com",
  "https://www.complisk.com",
  "http://localhost:8000",
  "http://localhost:8080",
  "http://localhost:3001",
  "http://localhost:3000",
];

const normalizeOriginCandidates = (value) => {
  if (!value) return [];

  const input = String(value).trim();
  if (!input) return [];

  // If user provides a single domain like "complisk.com", generate common variants.
  if (!/^https?:\/\//i.test(input) && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input)) {
    const bare = input.replace(/^www\./i, "");
    return [`https://${bare}`, `https://www.${bare}`];
  }

  // If user provides comma-separated origins, keep as-is.
  return input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^https?:\/\//i.test(part));
};

const allowedOriginsSet = new Set([
  ...defaultOrigins,
  ...normalizeOriginCandidates(process.env.CORS_ORIGINS),
  ...normalizeOriginCandidates(process.env.FRONTEND_URL),
]);

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);

    if (allowedOriginsSet.has(origin)) return callback(null, true);

    // Block unknown origins (browser will show CORS error)
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.set("trust proxy", true);

// Body parser middleware (except for webhook route)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Setup model relationships FIRST (before routes use them)
setupModelRelationships();

// Setup routes AFTER relationships are established
setupRoutes(app);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
