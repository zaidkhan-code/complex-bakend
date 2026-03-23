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
let hasStartedCronJobs = false;
let hasStartedWorkers = false;

const startHttpServer = () =>
  new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      resolve(server);
    });

    server.once("error", (error) => {
      reject(error);
    });
  });

const cleanupResources = async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
    httpServer = null;
  }

  if (hasStartedCronJobs) {
    stopCronJobs();
    hasStartedCronJobs = false;
  }

  if (hasStartedWorkers) {
    await stopPgBoss();
    hasStartedWorkers = false;
  }

  await sequelize.close();
};

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Bind the port before starting background jobs so EADDRINUSE is handled early.
    httpServer = await startHttpServer();

    if (enableJobWorkers) {
      // Start pg-boss + workers for promotion scheduling
      await startPgBoss();
      await registerPromotionScheduleWorkers();
      hasStartedWorkers = true;
      console.log("Background workers enabled");
    } else {
      console.log("Background workers disabled");
    }

    if (enableCronJobs) {
      // Start cron jobs
      startCronJobs();
      hasStartedCronJobs = true;
      console.log("Cron jobs enabled");
    } else {
      console.log("Cron jobs disabled");
    }
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing backend process or change PORT in .env.`
      );
    }
    console.error("Failed to start server:", error);
    try {
      await cleanupResources();
    } catch (cleanupError) {
      console.error("Failed during startup cleanup:", cleanupError);
    }
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
  await cleanupResources();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server gracefully");
  await cleanupResources();
  process.exit(0);
});

startServer();
