const { Sequelize } = require("sequelize");
require("dotenv").config();

// Force pg to be bundled by Vercel.
const pg = require("pg");

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
    ssl:
      process.env.DB_SSL === "true"
        ? { require: true, rejectUnauthorized: false }
        : false,
  },
});

const isEnumCommentAlterSyntaxError = (error) => {
  const dbCode = error?.original?.code || error?.parent?.code;
  const sql = error?.original?.sql || error?.parent?.sql || error?.sql || "";
  const message = error?.message || "";

  return (
    dbCode === "42601" &&
    /USING/i.test(message) &&
    /COMMENT ON COLUMN/i.test(sql) &&
    /enum_/i.test(sql)
  );
};

const stripEnumCommentsForAlter = () => {
  let strippedCount = 0;

  for (const model of Object.values(sequelize.models)) {
    if (!model?.rawAttributes) continue;

    let changed = false;
    for (const attr of Object.values(model.rawAttributes)) {
      const isEnum = attr?.type?.key === "ENUM";
      if (isEnum && attr.comment) {
        delete attr.comment;
        changed = true;
        strippedCount += 1;
      }
    }

    if (changed && typeof model.refreshAttributes === "function") {
      model.refreshAttributes();
    }
  }

  return strippedCount;
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();

    const shouldSyncAlter =
      process.env.NODE_ENV === "development" &&
      process.env.DB_SYNC_ALTER === "true";

    // Only run altering sync when explicitly enabled in development.
    if (shouldSyncAlter) {
      try {
        // await sequelize.sync({ alter: true });
      } catch (error) {
        if (!isEnumCommentAlterSyntaxError(error)) {
          throw error;
        }

        const strippedCount = stripEnumCommentsForAlter();
        console.warn(
          `Detected Sequelize/Postgres ENUM+comment alter SQL bug. Retrying alter sync with ${strippedCount} ENUM comment(s) stripped.`,
        );

        // await sequelize.sync({ alter: true });
      }
      console.log("Database synchronized (alter mode)");
    }

    console.log("PostgreSQL connected successfully");
  } catch (error) {
    console.error("Unable to connect to database", error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
