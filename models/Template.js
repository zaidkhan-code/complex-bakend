const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Template = sequelize.define(
  "Template",
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
    defaultImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Cloudinary uploaded image URL",
    },
    cloudinaryPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Cloudinary public ID for image management",
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Template;
