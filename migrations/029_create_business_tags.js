const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables();

      // Add placeId to Businesses (used to match Google Place tags to registered businesses)
      const businessTable = await queryInterface.describeTable("Businesses");
      if (!businessTable.placeId) {
        await queryInterface.addColumn(
          "Businesses",
          "placeId",
          {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: "Google Places place_id for matching business taggings",
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_businesses_place_id" ON "Businesses" ("placeId") WHERE "placeId" IS NOT NULL;',
        { transaction },
      );

      if (!tables.includes("BusinessTaggings")) {
        await queryInterface.createTable(
          "BusinessTaggings",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            taggerUserId: {
              type: DataTypes.UUID,
              allowNull: true,
              references: {
                model: "Users",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            taggerBusinessId: {
              type: DataTypes.UUID,
              allowNull: true,
              references: {
                model: "Businesses",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            targetPlaceId: {
              type: DataTypes.STRING(255),
              allowNull: false,
              comment: "Google Places place_id of the tagged business",
            },
            targetName: {
              type: DataTypes.STRING(255),
              allowNull: false,
              comment: "Name shown to the tagger at tag time",
            },
            targetAddress: {
              type: DataTypes.TEXT,
              allowNull: true,
              comment: "Formatted address / description at tag time",
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

      // Ensure a tagging row belongs to exactly one tagger (user OR business)
      await queryInterface.sequelize.query(
        `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_business_taggings_one_tagger'
  ) THEN
    ALTER TABLE "BusinessTaggings"
    ADD CONSTRAINT "chk_business_taggings_one_tagger"
    CHECK (
      (CASE WHEN "taggerUserId" IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN "taggerBusinessId" IS NULL THEN 0 ELSE 1 END)
      = 1
    );
  END IF;
END $$;
`,
        { transaction },
      );

      // Partial unique indexes to prevent duplicate tags per tagger
      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_business_taggings_user_target" ON "BusinessTaggings" ("taggerUserId", "targetPlaceId") WHERE "taggerUserId" IS NOT NULL;',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_business_taggings_business_target" ON "BusinessTaggings" ("taggerBusinessId", "targetPlaceId") WHERE "taggerBusinessId" IS NOT NULL;',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_business_taggings_target_place_id" ON "BusinessTaggings" ("targetPlaceId");',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "idx_business_taggings_created_at" ON "BusinessTaggings" ("createdAt" DESC);',
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
        'DROP INDEX IF EXISTS "idx_business_taggings_created_at";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_business_taggings_target_place_id";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "uniq_business_taggings_business_target";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "uniq_business_taggings_user_target";',
        { transaction },
      );
      await queryInterface.dropTable("BusinessTaggings", { transaction });

      await queryInterface.sequelize.query(
        `
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_businesses_place_id') THEN
    DROP INDEX "uniq_businesses_place_id";
  END IF;
END $$;
`,
        { transaction },
      );

      const businessTable = await queryInterface.describeTable("Businesses");
      if (businessTable.placeId) {
        await queryInterface.removeColumn("Businesses", "placeId", {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

