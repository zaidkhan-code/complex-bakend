const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const table = await queryInterface.describeTable("Businesses");

    if (!table.logoUrl) {
      await queryInterface.addColumn("Businesses", "logoUrl", {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Business profile logo image URL",
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("Businesses");
    if (table.logoUrl) {
      await queryInterface.removeColumn("Businesses", "logoUrl");
    }
  },
};
