const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables({ transaction });

      if (!tables.includes("Photos")) {
        await queryInterface.createTable(
          "Photos",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
              allowNull: false,
            },
            title: {
              type: DataTypes.STRING,
              allowNull: false,
            },
            description: {
              type: DataTypes.TEXT,
              allowNull: true,
            },
            imageUrl: {
              type: DataTypes.STRING,
              allowNull: false,
            },
            cloudinaryPublicId: {
              type: DataTypes.STRING,
              allowNull: true,
            },
            altText: {
              type: DataTypes.STRING,
              allowNull: true,
            },
            isActive: {
              type: DataTypes.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            sortOrder: {
              type: DataTypes.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
          UPDATE "Roles"
          SET "permissions" = CASE
            WHEN COALESCE("permissions", '{}'::jsonb) ? 'photos' THEN "permissions"
            ELSE COALESCE("permissions", '{}'::jsonb) || '{"photos":["view","create","edit","delete"]}'::jsonb
          END
          WHERE "isSystem" = true;
        `,
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
      const tables = await queryInterface.showAllTables({ transaction });

      if (tables.includes("Photos")) {
        await queryInterface.dropTable("Photos", { transaction });
      }

      await queryInterface.sequelize.query(
        `
          UPDATE "Roles"
          SET "permissions" = COALESCE("permissions", '{}'::jsonb) - 'photos'
          WHERE COALESCE("permissions", '{}'::jsonb) ? 'photos';
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
