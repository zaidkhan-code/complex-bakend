module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add `business_tagging: ["view"]` to role permissions (if missing)
      await queryInterface.sequelize.query(
        `
UPDATE "Roles"
SET "permissions" = CASE
  WHEN "permissions" ? 'business_tagging' THEN "permissions"
  ELSE "permissions" || '{"business_tagging":["view"]}'::jsonb
END;
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
        `
UPDATE "Roles"
SET "permissions" = "permissions" - 'business_tagging'
WHERE "permissions" ? 'business_tagging';
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

