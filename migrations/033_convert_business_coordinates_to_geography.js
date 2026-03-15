module.exports = {
  up: async (queryInterface) => {
    // We only store `lat`/`lng` on Businesses now.
    // If an earlier attempt added any `coordinates` column, remove it so follow-up migrations can add the correct type.
    //
    // Intentionally NOT wrapped in an explicit transaction:
    // - DDL here can take time (locks), and some hosted Postgres/poolers can drop long-lived transactions.
    // - Each step is idempotent, and the migration runner only records success at the end.

    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "idx_businesses_coordinates_gist";',
    );

    const table = await queryInterface.describeTable("Businesses");

    if (table.coordinates) {
      await queryInterface.removeColumn("Businesses", "coordinates");
    }

    if (table.coordinates_legacy_point) {
      await queryInterface.removeColumn("Businesses", "coordinates_legacy_point");
    }
  },

  down: async (queryInterface) => {
    // no-op (lat/lng remain)
  },
};
