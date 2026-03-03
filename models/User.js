const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
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
    wishlist: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Roles",
        key: "id",
      },
    },

    accountType: {
      type: DataTypes.ENUM("user", "business", "admin"),
      defaultValue: "user",
      comment:
        "Distinguishes between regular user, business, and admin account types",
    },
    isSuperAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "SuperAdmin has all permissions",
    },
    // Avatar URL (Cloudinary secure URL)
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "User profile avatar image URL",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "blocked", "suspended"),
      defaultValue: "active",
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "UTC",
      comment: "User timezone used for admin/business schedule actions",
    },
  },
  {
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  },
);

User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
