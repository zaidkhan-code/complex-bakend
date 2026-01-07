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
    category: {
      type: DataTypes.ENUM(
        "Restaurants",
        "Beauty & Spas",
        "Home & Garden",
        "Coffee & Tea",
        "Food",
        "Auto Services",
        "Pets",
        "Professional Services",
        "Health & Medical",
        "Event Planning & Services",
        "Hotels & Casinos",
        "Nightlife",
        "Active Life",
        "Education",
        "Arts & Entertainment",
        "Travel & Activities",
        "Online Shopping",
        "Shopping",
        "Real Estate",
        "Mass Media",
        "General Merchandise Store"
      ),
      allowNull: false,
      defaultValue: "Restaurants", // ✅ VERY IMPORTANT
    },

    state: {
      type: DataTypes.STRING,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
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
  }
);

Business.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = Business;
