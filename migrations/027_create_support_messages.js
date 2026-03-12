const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables();

      if (!tables.includes("SupportMessages")) {
        await queryInterface.createTable(
          "SupportMessages",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            senderType: {
              type: DataTypes.ENUM("customer", "business"),
              allowNull: false,
            },
            name: {
              type: DataTypes.STRING(120),
              allowNull: false,
            },
            email: {
              type: DataTypes.STRING(255),
              allowNull: false,
            },
            subject: {
              type: DataTypes.STRING(200),
              allowNull: false,
            },
            body: {
              type: DataTypes.TEXT,
              allowNull: false,
            },
            ipAddress: {
              type: DataTypes.STRING(80),
              allowNull: true,
            },
            userAgent: {
              type: DataTypes.STRING(500),
              allowNull: true,
            },
            meta: {
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
        'CREATE INDEX IF NOT EXISTS "idx_support_messages_created_at" ON "SupportMessages" ("createdAt" DESC);',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_support_messages_sender_type" ON "SupportMessages" ("senderType");',
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
        'DROP INDEX IF EXISTS "idx_support_messages_sender_type";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_support_messages_created_at";',
        { transaction },
      );
      await queryInterface.dropTable("SupportMessages", { transaction });

      // Best-effort cleanup for the enum type created by Sequelize.
      await queryInterface.sequelize.query(
        'DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = \'enum_SupportMessages_senderType\') THEN DROP TYPE "enum_SupportMessages_senderType"; END IF; END $$;',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

