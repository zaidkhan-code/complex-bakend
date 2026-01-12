// Main routes index file
// This file centralizes all route configurations and model relationships

const locationRoutes = require("./locationRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const businessRoutes = require("./businessRoutes");
const adminRoutes = require("./adminRoutes");
const promotionRoutes = require("./promotionRoutes");
const paymentRoutes = require("./paymentRoutes");

// Import models
const Business = require("../models/Business");
const Promotion = require("../models/Promotion");
const Template = require("../models/Template");

/**
 * Setup all model relationships
 */
const setupModelRelationships = () => {
  // A Business has many Promotions
  Business.hasMany(Promotion, {
    foreignKey: "businessId",
    as: "promotions",
  });

  // A Promotion belongs to a Business
  Promotion.belongsTo(Business, {
    foreignKey: "businessId",
    as: "business",
  });
  Template.hasMany(Promotion, { foreignKey: "templateId", as: "promotions" });
  Promotion.belongsTo(Template, { foreignKey: "templateId", as: "template" });
};

/**
 * Setup all route handlers
 * @param {Express.App} app - Express application instance
 */
const setupRoutes = (app) => {
  // Health check route
  app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // API Routes
  app.use("/api/location", locationRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/business", businessRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/promotions", promotionRoutes);
  app.use("/api/payment", paymentRoutes);
};

module.exports = {
  setupRoutes,
  setupModelRelationships,
  locationRoutes,
  authRoutes,
  userRoutes,
  businessRoutes,
  adminRoutes,
  promotionRoutes,
  paymentRoutes,
};
