module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const promotionColumns = await queryInterface.describeTable("Promotions", {
        transaction,
      });

      if (!promotionColumns.scheduleEnabled) {
        await queryInterface.addColumn(
          "Promotions",
          "scheduleEnabled",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction },
        );
      }

      if (!promotionColumns.scheduleTimezone) {
        await queryInterface.addColumn(
          "Promotions",
          "scheduleTimezone",
          {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "UTC",
          },
          { transaction },
        );
      }

      if (!promotionColumns.scheduleStartAt) {
        await queryInterface.addColumn(
          "Promotions",
          "scheduleStartAt",
          {
            type: Sequelize.DATE,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!promotionColumns.scheduleEndAt) {
        await queryInterface.addColumn(
          "Promotions",
          "scheduleEndAt",
          {
            type: Sequelize.DATE,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!promotionColumns.activationJobId) {
        await queryInterface.addColumn(
          "Promotions",
          "activationJobId",
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!promotionColumns.expirationJobId) {
        await queryInterface.addColumn(
          "Promotions",
          "expirationJobId",
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      const businessColumns = await queryInterface.describeTable("Businesses", {
        transaction,
      });

      if (!businessColumns.timezone) {
        await queryInterface.addColumn(
          "Businesses",
          "timezone",
          {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "UTC",
          },
          { transaction },
        );
      }

      const userColumns = await queryInterface.describeTable("Users", {
        transaction,
      });

      if (!userColumns.timezone) {
        await queryInterface.addColumn(
          "Users",
          "timezone",
          {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "UTC",
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
          UPDATE "Promotions"
          SET "scheduleStartAt" = COALESCE(
                "scheduleStartAt",
                ("runDate"::timestamp + "runTime"::time)
              ),
              "scheduleEndAt" = COALESCE(
                "scheduleEndAt",
                ("stopDate"::timestamp + "stopTime"::time)
              ),
              "scheduleTimezone" = COALESCE(NULLIF("scheduleTimezone", ''), 'UTC'),
              "scheduleEnabled" = COALESCE("scheduleEnabled", false),
              "updatedAt" = NOW()
          WHERE "runDate" IS NOT NULL
            AND "stopDate" IS NOT NULL
            AND "runTime" IS NOT NULL
            AND "stopTime" IS NOT NULL;
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          CREATE INDEX IF NOT EXISTS "idx_promotions_business_schedule_window"
          ON "Promotions" ("businessId", "scheduleEnabled", "scheduleStartAt", "scheduleEndAt");
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          CREATE INDEX IF NOT EXISTS "idx_promotions_schedule_end"
          ON "Promotions" ("scheduleEndAt");
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
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_promotions_schedule_end";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "idx_promotions_business_schedule_window";',
        { transaction },
      );

      const promotionColumns = await queryInterface.describeTable("Promotions", {
        transaction,
      });

      if (promotionColumns.expirationJobId) {
        await queryInterface.removeColumn("Promotions", "expirationJobId", {
          transaction,
        });
      }
      if (promotionColumns.activationJobId) {
        await queryInterface.removeColumn("Promotions", "activationJobId", {
          transaction,
        });
      }
      if (promotionColumns.scheduleEndAt) {
        await queryInterface.removeColumn("Promotions", "scheduleEndAt", {
          transaction,
        });
      }
      if (promotionColumns.scheduleStartAt) {
        await queryInterface.removeColumn("Promotions", "scheduleStartAt", {
          transaction,
        });
      }
      if (promotionColumns.scheduleTimezone) {
        await queryInterface.removeColumn("Promotions", "scheduleTimezone", {
          transaction,
        });
      }
      if (promotionColumns.scheduleEnabled) {
        await queryInterface.removeColumn("Promotions", "scheduleEnabled", {
          transaction,
        });
      }

      const businessColumns = await queryInterface.describeTable("Businesses", {
        transaction,
      });
      if (businessColumns.timezone) {
        await queryInterface.removeColumn("Businesses", "timezone", {
          transaction,
        });
      }

      const userColumns = await queryInterface.describeTable("Users", {
        transaction,
      });
      if (userColumns.timezone) {
        await queryInterface.removeColumn("Users", "timezone", { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
