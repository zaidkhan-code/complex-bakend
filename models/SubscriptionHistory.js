// models/SubscriptionHistory.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SubscriptionHistory = sequelize.define(
  "SubscriptionHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    stripeSubscriptionId: DataTypes.STRING,
    stripePriceId: DataTypes.STRING,

    months: DataTypes.INTEGER,

    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,

    status: {
      type: DataTypes.ENUM("active", "expired", "canceled"),
      defaultValue: "active",
    },
  },
  { timestamps: true },
);

module.exports = SubscriptionHistory;
