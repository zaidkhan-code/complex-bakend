const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const usersTable = await queryInterface.describeTable("Users");
    const businessesTable = await queryInterface.describeTable("Businesses");

    if (!usersTable.resetPasswordToken) {
      await queryInterface.addColumn("Users", "resetPasswordToken", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!usersTable.resetPasswordExpires) {
      await queryInterface.addColumn("Users", "resetPasswordExpires", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }

    if (!businessesTable.resetPasswordToken) {
      await queryInterface.addColumn("Businesses", "resetPasswordToken", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!businessesTable.resetPasswordExpires) {
      await queryInterface.addColumn("Businesses", "resetPasswordExpires", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const usersTable = await queryInterface.describeTable("Users");
    const businessesTable = await queryInterface.describeTable("Businesses");

    if (usersTable.resetPasswordToken) {
      await queryInterface.removeColumn("Users", "resetPasswordToken");
    }

    if (usersTable.resetPasswordExpires) {
      await queryInterface.removeColumn("Users", "resetPasswordExpires");
    }

    if (businessesTable.resetPasswordToken) {
      await queryInterface.removeColumn("Businesses", "resetPasswordToken");
    }

    if (businessesTable.resetPasswordExpires) {
      await queryInterface.removeColumn("Businesses", "resetPasswordExpires");
    }
  },
};
