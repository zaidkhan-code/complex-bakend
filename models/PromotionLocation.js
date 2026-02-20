const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PromotionLocation = sequelize.define(
  "PromotionLocation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    promotionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Promotions",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    type: {
      type: DataTypes.ENUM("country", "state", "city", "county", "timezone"),
      allowNull: false,
    },

    country_code: {
      type: DataTypes.STRING(5),
    },

    state_code: {
      type: DataTypes.STRING(10),
    },

    state_name: {
      type: DataTypes.STRING(150),
    },

    city_name: {
      type: DataTypes.STRING(150),
    },

    county_name: {
      type: DataTypes.STRING(150),
    },

    timezone: {
      type: DataTypes.STRING(100),
    },

    // PostGIS geography point
    coordinates: {
      type: DataTypes.GEOGRAPHY("POINT", 4326),
      allowNull: true,
    },
  },
  {
    tableName: "PromotionLocations",
    timestamps: true,

    indexes: [
      {
        fields: ["promotionId"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["country_code"],
      },
      {
        fields: ["state_code"],
      },
      {
        fields: ["state_name"],
      },
      {
        fields: ["city_name"],
      },
      {
        fields: ["timezone"],
      },

      // Composite index (very important)
      {
        name: "idx_admin_combo",
        fields: ["type", "country_code", "state_code", "city_name"],
      },

      // GIST index for radius search
      {
        name: "idx_coordinates_gist",
        using: "gist",
        fields: ["coordinates"],
      },

      // Prevent duplicates
      {
        unique: true,
        name: "uniq_promotion_location",
        fields: [
          "promotionId",
          "type",
          "country_code",
          "state_code",
          "city_name",
          "timezone",
        ],
      },
    ],
  },
);

module.exports = PromotionLocation;
