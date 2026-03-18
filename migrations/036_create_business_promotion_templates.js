const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });

      if (!tables.includes("BusinessPromotionTemplates")) {
        await queryInterface.createTable(
          "BusinessPromotionTemplates",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            businessId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "Businesses",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            name: {
              type: DataTypes.STRING(150),
              allowNull: false,
            },
            templateId: {
              type: DataTypes.UUID,
              allowNull: true,
              references: {
                model: "Templates",
                key: "id",
              },
              onDelete: "SET NULL",
            },
            imageUrl: {
              type: DataTypes.TEXT,
              allowNull: false,
            },
            text: {
              type: DataTypes.JSONB,
              allowNull: false,
              defaultValue: [],
            },
            backgroundColor: {
              type: DataTypes.STRING,
              allowNull: true,
              defaultValue: "",
            },
            metadata: {
              type: DataTypes.JSONB,
              allowNull: false,
              defaultValue: {},
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("NOW()"),
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("NOW()"),
            },
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_business_promotion_templates_business" ON "BusinessPromotionTemplates" ("businessId");',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_business_promotion_templates_business_created" ON "BusinessPromotionTemplates" ("businessId", "createdAt" DESC);',
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
        'DROP INDEX IF EXISTS "idx_business_promotion_templates_business_created";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_business_promotion_templates_business";',
        { transaction },
      );
      await queryInterface.dropTable("BusinessPromotionTemplates", {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
