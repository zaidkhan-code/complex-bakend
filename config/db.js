const { Sequelize } = require("sequelize");
require("dotenv").config();

// Force pg to be bundled by Vercel.
const pg = require("pg");

const parseEnvNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOptionalEnvNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const isSslEnabled = process.env.DB_SSL === "true";
const dbStatementTimeoutMs = parseOptionalEnvNumber(
  process.env.DB_STATEMENT_TIMEOUT_MS,
);
const dbQueryTimeoutMs = parseOptionalEnvNumber(process.env.DB_QUERY_TIMEOUT_MS);
const dbConnectionTimeoutMs = parseEnvNumber(
  process.env.DB_CONNECTION_TIMEOUT_MS,
  20000,
);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: isSslEnabled ? { require: true, rejectUnauthorized: false } : false,
    keepAlive: true,
    connectionTimeoutMillis: dbConnectionTimeoutMs,
    ...(dbStatementTimeoutMs
      ? { statement_timeout: dbStatementTimeoutMs }
      : {}),
    ...(dbQueryTimeoutMs ? { query_timeout: dbQueryTimeoutMs } : {}),
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();

    const shouldSyncAlter =
      process.env.NODE_ENV === "development" &&
      process.env.DB_SYNC_ALTER === "true" &&
      false;

    // Only run altering sync when explicitly enabled in development.
    if (shouldSyncAlter) {
      // await sequelize.sync({ alter: true });
      // console.log("Database synchronized (alter mode)");
    }

    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("Unable to connect to database", error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
