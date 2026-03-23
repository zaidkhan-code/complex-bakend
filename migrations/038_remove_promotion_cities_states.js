module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_promotions_cities_gin";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_promotions_states_gin";',
        { transaction },
      );

      const promotionColumns = await queryInterface.describeTable("Promotions");

      if (promotionColumns.cities) {
        await queryInterface.removeColumn("Promotions", "cities", {
          transaction,
        });
      }

      if (promotionColumns.states) {
        await queryInterface.removeColumn("Promotions", "states", {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const promotionColumns = await queryInterface.describeTable("Promotions");

      if (!promotionColumns.cities) {
        await queryInterface.addColumn(
          "Promotions",
          "cities",
          {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          { transaction },
        );
      }

      if (!promotionColumns.states) {
        await queryInterface.addColumn(
          "Promotions",
          "states",
          {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: [],
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_promotions_cities_gin" ON "Promotions" USING GIN ("cities");',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_promotions_states_gin" ON "Promotions" USING GIN ("states");',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

