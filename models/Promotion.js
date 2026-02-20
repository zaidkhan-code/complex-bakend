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
      allowNull: true,
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
    categories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    // Support multiple cities/states/timezones for a promotion (JSON arrays)
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
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Flexible metadata store for custom data",
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
    indexes: [
      {
        name: "idx_promotions_status",
        fields: ["status"],
      },
      {
        name: "idx_promotions_business_id",
        fields: ["businessId"],
      },
      {
        name: "idx_promotions_business_status_created",
        fields: ["businessId", "status", "createdAt"],
      },
      {
        name: "idx_promotions_run_stop",
        fields: ["runDate", "stopDate"],
      },
      {
        name: "idx_promotions_payment_status",
        fields: ["paymentStatus"],
      },
      {
        name: "idx_promotions_categories_gin",
        using: "gin",
        fields: ["categories"],
      },
      {
        name: "idx_promotions_cities_gin",
        using: "gin",
        fields: ["cities"],
      },
      {
        name: "idx_promotions_states_gin",
        using: "gin",
        fields: ["states"],
      },
      {
        name: "idx_promotions_timezones_gin",
        using: "gin",
        fields: ["timezones"],
      },
    ],
  },
);

module.exports = Promotion;
