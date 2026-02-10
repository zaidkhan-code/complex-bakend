const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Promotions", "businessId", {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Businesses",
        key: "id",
      },
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to NOT NULL (⚠ requires no null rows exist)
    await queryInterface.changeColumn("Promotions", "businessId", {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Businesses",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await queryInterface.removeIndex(
      "Promotions",
      "idx_promotions_business_id",
    );
  },
};
