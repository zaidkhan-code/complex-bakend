module.exports = {
  up: async (queryInterface) => {
    // Avoid an explicit long-lived transaction for this DDL-heavy migration.
    // Each statement is idempotent and safe to re-run if a connection drops mid-way.

    // PromotionLocations already uses GEOGRAPHY, so PostGIS should already be enabled.
    // Still, keep this best-effort for fresh DBs.
    try {
      await queryInterface.sequelize.query(
        "CREATE EXTENSION IF NOT EXISTS postgis;",
      );
    } catch (e) {
      // ignore
    }

    const table = await queryInterface.describeTable("Businesses");

    if (!table.coordinates) {
      await queryInterface.sequelize.query(
        'ALTER TABLE "Businesses" ADD COLUMN "coordinates" geography(POINT,4326);',
      );
    }

    // Backfill from existing lat/lng
    await queryInterface.sequelize.query(
      `
UPDATE "Businesses"
SET "coordinates" = ST_SetSRID(ST_MakePoint("lng","lat"), 4326)::geography
WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL AND "coordinates" IS NULL;
`,
    );

    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS "idx_businesses_coordinates_gist" ON "Businesses" USING GIST ("coordinates");',
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "idx_businesses_coordinates_gist";',
    );

    const table = await queryInterface.describeTable("Businesses");
    if (table.coordinates) {
      await queryInterface.removeColumn("Businesses", "coordinates");
    }
  },
};
