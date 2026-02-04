const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Wishlist = sequelize.define(
  "Wishlist",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      comment: "Reference to User if saved by a regular user",
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Businesses",
        key: "id",
      },
      onDelete: "CASCADE",
      comment: "Reference to Business if saved by a business account",
    },
    promotionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Promotions",
        key: "id",
      },
      onDelete: "CASCADE",
      comment: "Reference to Promotion being saved",
    },
    status: {
      type: DataTypes.ENUM("active", "removed"),
      defaultValue: "active",
      comment: "Status of the wishlist entry",
    },
    savedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "Timestamp when the promotion was saved",
    },
  },
  {
    timestamps: true,
    tableName: "Wishlists",
    comment: "Stores wishlist entries for both users and businesses",
    indexes: [
      {
        fields: ["userId", "promotionId"],
        unique: true,
        name: "unique_user_promotion",
      },
      {
        fields: ["businessId", "promotionId"],
        unique: true,
        name: "unique_business_promotion",
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["businessId"],
      },
      {
        fields: ["promotionId"],
      },
      {
        fields: ["status"],
      },
    ],
  },
);

module.exports = Wishlist;
