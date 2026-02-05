const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();

      if (tables.includes("Users")) {
        await queryInterface.addColumn(
          "Users",
          "avatarUrl",
          {
            type: DataTypes.STRING,
            allowNull: true,
          },
          { transaction },
        );

        console.log("✅ avatarUrl column added to Users table");
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();

      if (tables.includes("Users")) {
        await queryInterface.removeColumn("Users", "avatarUrl", {
          transaction,
        });
        console.log("✅ avatarUrl column removed from Users table");
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration rollback failed:", error);
      throw error;
    }
  },
};
