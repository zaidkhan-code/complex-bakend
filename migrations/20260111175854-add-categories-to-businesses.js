"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Businesses", "categories", {
      type: Sequelize.JSONB,
      allowNull: false,
      freezeTableName: true,
      defaultValue: [],
      comment: "Array of selected categories (max 2)",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Businesses", "categories");
  },
};
