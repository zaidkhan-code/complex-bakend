const { Sequelize } = require("sequelize");
require("dotenv").config();

// 🔥 FORCE pg to be bundled by Vercel
const pg = require("pg");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg, // 🔥 VERY IMPORTANT
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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully ✅");

    // ❗ IMPORTANT: NEVER sync in production on Vercel
    if (process.env.NODE_ENV === "development") {
      // await sequelize.sync({ alter: true });
      console.log("Database synchronized");
    }
  } catch (error) {
    console.error("Unable to connect to database ❌", error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

// const { Sequelize } = require("sequelize");
// require("dotenv").config();

// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: "postgres",
//   logging: process.env.NODE_ENV === "development" ? console.log : false,
//   pool: {
//     max: 5,
//     min: 0,
//     acquire: 30000,
//     idle: 10000,
//   },
// });

// const connectDB = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("PostgreSQL connected successfully");

//     // Sync all models
//     await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
//     console.log("Database synchronized");
//   } catch (error) {
//     console.error("Unable to connect to database:", error);
//     process.exit(1);
//   }
// };

// module.exports = { sequelize, connectDB };
