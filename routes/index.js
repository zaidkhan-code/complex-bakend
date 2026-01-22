// Main routes index file
// This file centralizes all route configurations and model relationships

const locationRoutes = require("./locationRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const businessRoutes = require("./businessRoutes");
const adminRoutes = require("./adminRoutes");
const promotionRoutes = require("./promotionRoutes");
const paymentRoutes = require("./paymentRoutes");
const roleRoutes = require("./roleRoutes");

// Import models
const Business = require("../models/Business");
const Promotion = require("../models/Promotion");
const Template = require("../models/Template");
const User = require("../models/User");
const Role = require("../models/Role");
const { default: axios } = require("axios");
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

  Role.hasMany(User, {
    foreignKey: "roleId",
    as: "users",
  });

  User.belongsTo(Role, {
    foreignKey: "roleId",
    as: "role",
  });
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
  app.use("/api/roles", roleRoutes);
  app.use("/api/promotions", promotionRoutes);
  app.use("/api/payment", paymentRoutes);
  app.get("/api/locationtest", async (req, res) => {
    try {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

      const response = await axios.get(
        `https://ipinfo.io/${ip}?token=YOUR_TOKEN`,
      );

      const data = response.data;

      res.json({
        ip: data.ip,
        city: data.city,
        state: data.region,
        country: data.country,
        timezone: data.timezone,
        loc: data.loc, // "lat,long"
      });
    } catch (err) {
      res.status(500).json({ error: "Location fetch failed" });
    }
  });
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
  roleRoutes,
};
