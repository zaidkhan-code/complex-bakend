module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const promotionsColumns = await queryInterface.describeTable('Promotions');
      const businessesColumns = await queryInterface.describeTable('Businesses');

      const indexDefinitions = [
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_status" ON "Promotions" ("status");',
          tableColumns: promotionsColumns,
          requiredColumns: ['status'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_business_id" ON "Promotions" ("businessId");',
          tableColumns: promotionsColumns,
          requiredColumns: ['businessId'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_business_status_created" ON "Promotions" ("businessId", "status", "createdAt");',
          tableColumns: promotionsColumns,
          requiredColumns: ['businessId', 'status', 'createdAt'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_run_stop" ON "Promotions" ("runDate", "stopDate");',
          tableColumns: promotionsColumns,
          requiredColumns: ['runDate', 'stopDate'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_payment_status" ON "Promotions" ("paymentStatus");',
          tableColumns: promotionsColumns,
          requiredColumns: ['paymentStatus'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_categories_gin" ON "Promotions" USING GIN ("categories");',
          tableColumns: promotionsColumns,
          requiredColumns: ['categories'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_cities_gin" ON "Promotions" USING GIN ("cities");',
          tableColumns: promotionsColumns,
          requiredColumns: ['cities'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_states_gin" ON "Promotions" USING GIN ("states");',
          tableColumns: promotionsColumns,
          requiredColumns: ['states'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_promotions_timezones_gin" ON "Promotions" USING GIN ("timezones");',
          tableColumns: promotionsColumns,
          requiredColumns: ['timezones'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_businesses_status_created" ON "Businesses" ("status", "createdAt");',
          tableColumns: businessesColumns,
          requiredColumns: ['status', 'createdAt'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_businesses_auto_approve" ON "Businesses" ("autoApprovePromotions");',
          tableColumns: businessesColumns,
          requiredColumns: ['autoApprovePromotions'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_businesses_subscription_status" ON "Businesses" ("subscriptionStatus");',
          tableColumns: businessesColumns,
          requiredColumns: ['subscriptionStatus'],
        },
        {
          sql: 'CREATE INDEX IF NOT EXISTS "idx_businesses_business_type" ON "Businesses" ("businessType");',
          tableColumns: businessesColumns,
          requiredColumns: ['businessType'],
        },
      ];

      for (const definition of indexDefinitions) {
        const canCreate = definition.requiredColumns.every((columnName) =>
          Object.prototype.hasOwnProperty.call(definition.tableColumns, columnName)
        );
        if (!canCreate) {
          continue;
        }
        await queryInterface.sequelize.query(definition.sql, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const statements = [
        'DROP INDEX IF EXISTS "idx_businesses_business_type";',
        'DROP INDEX IF EXISTS "idx_businesses_subscription_status";',
        'DROP INDEX IF EXISTS "idx_businesses_auto_approve";',
        'DROP INDEX IF EXISTS "idx_businesses_status_created";',
        'DROP INDEX IF EXISTS "idx_promotions_timezones_gin";',
        'DROP INDEX IF EXISTS "idx_promotions_states_gin";',
        'DROP INDEX IF EXISTS "idx_promotions_cities_gin";',
        'DROP INDEX IF EXISTS "idx_promotions_categories_gin";',
        'DROP INDEX IF EXISTS "idx_promotions_payment_status";',
        'DROP INDEX IF EXISTS "idx_promotions_run_stop";',
        'DROP INDEX IF EXISTS "idx_promotions_business_status_created";',
        'DROP INDEX IF EXISTS "idx_promotions_business_id";',
        'DROP INDEX IF EXISTS "idx_promotions_status";',
      ];

      for (const sql of statements) {
        await queryInterface.sequelize.query(sql, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
