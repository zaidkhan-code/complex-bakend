const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const BusinessPromotionTemplate = sequelize.define(
  "BusinessPromotionTemplate",
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
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Templates",
        key: "id",
      },
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    text: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    backgroundColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: "idx_business_promotion_templates_business",
        fields: ["businessId"],
      },
      {
        name: "idx_business_promotion_templates_business_created",
        fields: ["businessId", "createdAt"],
      },
    ],
  },
);

module.exports = BusinessPromotionTemplate;
