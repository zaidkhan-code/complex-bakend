const app = require("./app");
const { connectDB, sequelize } = require("./config/db");
const { startCronJobs, stopCronJobs } = require("./config/cronJobs");
const { startPgBoss, stopPgBoss } = require("./config/pgBoss");
const {
  registerPromotionScheduleWorkers,
} = require("./services/promotionScheduler");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";
const isCloudRun = Boolean(process.env.K_SERVICE);
const enableCronJobs =
  process.env.ENABLE_CRON_JOBS === undefined
    ? !isCloudRun
    : process.env.ENABLE_CRON_JOBS === "true";
const enableJobWorkers =
  process.env.ENABLE_JOB_WORKERS === undefined
    ? !isCloudRun
    : process.env.ENABLE_JOB_WORKERS === "true";
let httpServer = null;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    if (enableJobWorkers) {
      // Start pg-boss + workers for promotion scheduling
      await startPgBoss();
      await registerPromotionScheduleWorkers();
      console.log("Background workers enabled");
    } else {
      console.log("Background workers disabled");
    }

    if (enableCronJobs) {
      // Start cron jobs
      startCronJobs();
      console.log("Cron jobs enabled");
    } else {
      console.log("Cron jobs disabled");
    }

    // Start server
    httpServer = app.listen(PORT, HOST, () => {
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
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  if (enableCronJobs) stopCronJobs();
  if (enableJobWorkers) await stopPgBoss();
  await sequelize.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server gracefully");
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  if (enableCronJobs) stopCronJobs();
  if (enableJobWorkers) await stopPgBoss();
  await sequelize.close();
  process.exit(0);
});

startServer();
