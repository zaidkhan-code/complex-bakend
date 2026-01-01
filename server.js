const app = require("./app");
const { connectDB, sequelize } = require("./config/db");
const { startCronJobs } = require("./config/cronJobs");
require("dotenv").config();

// Models
const User = require("./models/User");
const Business = require("./models/Business");
const Template = require("./models/Template");
const Promotion = require("./models/Promotion");

// Define associations
Business.hasMany(Promotion, { foreignKey: "businessId", as: "promotions" });
Promotion.belongsTo(Business, { foreignKey: "businessId", as: "business" });

Template.hasMany(Promotion, { foreignKey: "templateId", as: "promotions" });
Promotion.belongsTo(Template, { foreignKey: "templateId", as: "template" });

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start cron jobs
    startCronJobs();

    // Start server
    app.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

// Handle SIGTERM
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server gracefully");
  await sequelize.close();
  process.exit(0);
});

startServer();
