const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Promotion = sequelize.define(
  "Promotion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Businesses",
        key: "id",
      },
    },
    templateId: {
      type: DataTypes.UUID,
      references: {
        model: "Templates",
        key: "id",
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    text: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Array of text objects with content, x, y, color, fontSize",
    },
    backgroundColor: {
      type: DataTypes.STRING,
      defaultValue: "",
      comment: "Background color for the promotion card",
    },
    category: {
      type: DataTypes.STRING,
    },
    // Support multiple cities/states/timezones for a promotion (JSON arrays)
    cities: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Array of city objects or codes for targeted cities",
    },
    states: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Array of state objects or state codes for targeted states",
    },
    runDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    stopDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    runTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    stopTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    // Calculated number of months the promotion runs for (derived from runDate/stopDate)
    calculatedMonths: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    timezones: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: "Array of timezone codes/objects for targeted timezones",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "pending", "expired"),
      defaultValue: "pending",
    },
    autoApprove: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment:
        "If true, promotion will be auto-activated after 24 hours (can be overridden by admin)",
    },
    approvedAt: {
      type: DataTypes.DATE,
      comment:
        "Timestamp when promotion was approved/activated by admin or auto-activated",
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "completed", "failed"),
      defaultValue: "pending",
      comment: "Payment status from Stripe",
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    clicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    stripePaymentId: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Promotion;
