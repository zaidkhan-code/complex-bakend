module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_Promotions_status'
            AND e.enumlabel = 'expired'
        ) THEN
          ALTER TYPE "enum_Promotions_status" ADD VALUE 'expired';
        END IF;
      END
      $$;
    `);
  },

  down: async () => {
    // PostgreSQL does not support removing enum values safely in-place.
  },
};

