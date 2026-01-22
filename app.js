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

// CORS
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:8080",
      "https://complisk.vercel.app",
      "http://localhost:8000",
      "http://localhost:8080",
    ],
    credentials: true,
  }),
);

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
