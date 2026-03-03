const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");

const Business = sequelize.define(
  "Business",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    businessType: {
      type: DataTypes.ENUM("small", "medium", "large", "online-ecommerce"),
      allowNull: false,
      defaultValue: "small",
    },
    categories: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Array of selected categories (max 2)",
    },
    personName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Contact person name",
    },
    businessAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Full business address",
    },
    state: {
      type: DataTypes.STRING,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "UTC",
      comment: "Business timezone for schedule interpretation",
    },
    autoApprovePromotions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "If true, all promotions from this business are auto-approved",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "blocked", "suspended"),
      defaultValue: "active",
    },
    subscriptionStatus: {
      type: DataTypes.ENUM("active", "expired", "canceled", "none"),
      defaultValue: "none",
    },
    subscriptionStart: DataTypes.DATE,
    subscriptionEnd: DataTypes.DATE,
    stripeSubscriptionId: DataTypes.STRING,
    stripeCustomerId: DataTypes.STRING,
  },
  {
    timestamps: true,
    indexes: [
      {
        name: "idx_businesses_status_created",
        fields: ["status", "createdAt"],
      },
      {
        name: "idx_businesses_auto_approve",
        fields: ["autoApprovePromotions"],
      },
      {
        name: "idx_businesses_subscription_status",
        fields: ["subscriptionStatus"],
      },
      {
        name: "idx_businesses_business_type",
        fields: ["businessType"],
      },
    ],
    hooks: {
      beforeCreate: async (business) => {
        if (business.password) {
          const salt = await bcrypt.genSalt(10);
          business.password = await bcrypt.hash(business.password, salt);
        }
      },
      beforeUpdate: async (business) => {
        if (business.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          business.password = await bcrypt.hash(business.password, salt);
        }
      },
    },
  },
);

Business.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = Business;
