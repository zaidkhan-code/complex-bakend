module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `
        UPDATE "Roles"
        SET permissions = jsonb_set(
          COALESCE(permissions, '{}'::jsonb),
          '{support_messages}',
          '["view","export"]'::jsonb,
          true
        )
        WHERE NOT (COALESCE(permissions, '{}'::jsonb) ? 'support_messages')
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
        SET permissions = COALESCE(permissions, '{}'::jsonb) - 'support_messages'
        WHERE COALESCE(permissions, '{}'::jsonb) ? 'support_messages'
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

