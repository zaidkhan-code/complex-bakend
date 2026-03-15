const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const BusinessTagging = sequelize.define(
  "BusinessTagging",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    taggerUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    taggerBusinessId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Businesses",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    targetPlaceId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    targetName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    targetAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetIconMaskBaseUri: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetIconBackgroundColor: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    targetPrimaryPhotoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetRating: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    targetUserRatingsTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    targetWebsite: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetGoogleUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetFormattedPhoneNumber: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    targetInternationalPhoneNumber: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    targetTypes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    targetReviews: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    detailsFetchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    targetEmail: {
      type: DataTypes.STRING(320),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "BusinessTaggings",
    indexes: [
      { fields: ["targetPlaceId"], name: "idx_business_taggings_target_place" },
      { fields: ["createdAt"], name: "idx_business_taggings_created_at" },
    ],
  },
);

module.exports = BusinessTagging;
