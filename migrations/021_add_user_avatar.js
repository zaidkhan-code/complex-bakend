const { DataTypes } = require("sequelize");

const normalizeTableName = (entry) => {
  if (typeof entry === "string") return entry.replace(/"/g, "");
  if (entry && typeof entry === "object") {
    return entry.tableName || entry.table_name || entry.name || "";
  }
  return "";
};

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const rawTables = await queryInterface.showAllTables();
      const tables = new Set(rawTables.map(normalizeTableName));

      if (tables.has("Users")) {
        const userColumns = await queryInterface.describeTable("Users");
        if (!userColumns.avatarUrl) {
          await queryInterface.addColumn(
            "Users",
            "avatarUrl",
            {
              type: DataTypes.STRING,
              allowNull: true,
            },
            { transaction },
          );
          console.log("avatarUrl column added to Users table");
        } else {
          console.log("avatarUrl column already exists on Users table");
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const rawTables = await queryInterface.showAllTables();
      const tables = new Set(rawTables.map(normalizeTableName));

      if (tables.has("Users")) {
        const userColumns = await queryInterface.describeTable("Users");
        if (userColumns.avatarUrl) {
          await queryInterface.removeColumn("Users", "avatarUrl", {
            transaction,
          });
          console.log("avatarUrl column removed from Users table");
        } else {
          console.log("avatarUrl column not found on Users table");
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("Migration rollback failed:", error);
      throw error;
    }
  },
};

