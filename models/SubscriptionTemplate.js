// models/SubscriptionTemplate.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SubscriptionTemplate = sequelize.define("SubscriptionTemplate", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  durationMonths: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  freeCities: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
  },
  freeStates: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  freeTimezones: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = SubscriptionTemplate;
