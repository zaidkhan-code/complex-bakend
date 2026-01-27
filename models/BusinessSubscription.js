// models/BusinessSubscription.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const BusinessSubscription = sequelize.define("BusinessSubscription", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  subscriptionTemplateId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,

  freeCities: DataTypes.INTEGER,
  freeStates: DataTypes.INTEGER,
  freeTimezones: DataTypes.INTEGER,

  status: {
    type: DataTypes.ENUM("active", "expired", "canceled"),
    defaultValue: "active",
  },

  stripeSubscriptionId: DataTypes.STRING,
});

module.exports = BusinessSubscription;
