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

const allowedOrigins = [
  "http://localhost:8080",
  "https://complisk.com",
  "https://www.complisk.com",
];

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log(`Blocked CORS request from origin: ${origin}`, allowedOrigins);

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
