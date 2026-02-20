module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = "PromotionLocations";
    const tableDefinition = await queryInterface.describeTable(tableName);

    if (!tableDefinition.state_name) {
      await queryInterface.addColumn(tableName, "state_name", {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "PromotionLocations"
      SET "state_name" = "state_code"
      WHERE "state_name" IS NULL
        AND "state_code" IS NOT NULL
        AND BTRIM("state_code") <> '';
    `);

    try {
      await queryInterface.addIndex(tableName, ["state_name"], {
        name: "idx_promotion_locations_state_name",
      });
    } catch (error) {
      // ignore if index already exists
    }
  },

  down: async (queryInterface) => {
    const tableName = "PromotionLocations";
    const tableDefinition = await queryInterface.describeTable(tableName);

    try {
      await queryInterface.removeIndex(
        tableName,
        "idx_promotion_locations_state_name",
      );
    } catch (error) {
      // ignore if index does not exist
    }

    if (tableDefinition.state_name) {
      await queryInterface.removeColumn(tableName, "state_name");
    }
  },
};
