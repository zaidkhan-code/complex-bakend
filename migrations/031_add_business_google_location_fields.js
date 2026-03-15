const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const businessTable = await queryInterface.describeTable("Businesses");

      if (!businessTable.lat) {
        await queryInterface.addColumn(
          "Businesses",
          "lat",
          {
            type: DataTypes.DOUBLE,
            allowNull: true,
            comment: "Latitude from Google Places business match",
          },
          { transaction },
        );
      }

      if (!businessTable.lng) {
        await queryInterface.addColumn(
          "Businesses",
          "lng",
          {
            type: DataTypes.DOUBLE,
            allowNull: true,
            comment: "Longitude from Google Places business match",
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_businesses_lat_lng" ON "Businesses" ("lat", "lng");',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_businesses_lat_lng";',
        { transaction },
      );

      const businessTable = await queryInterface.describeTable("Businesses");
      if (businessTable.lat) {
        await queryInterface.removeColumn("Businesses", "lat", { transaction });
      }
      if (businessTable.lng) {
        await queryInterface.removeColumn("Businesses", "lng", { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

