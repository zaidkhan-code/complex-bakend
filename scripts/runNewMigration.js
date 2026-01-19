#!/usr/bin/env node
/**
 * Migration runner script
 * Usage: node bakend/scripts/runNewMigration.js
 *
 * This script runs the new role management migration
 */

const { sequelize } = require("../config/db");
const path = require("path");

async function runMigration() {
  try {
    console.log("🔄 Starting migration...\n");

    // Import the migration
    const migration = require("../migrations/011_update_role_management_new");

    // Run the up function
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Handle signals
process.on("SIGINT", async () => {
  console.log("\n⚠️  Migration interrupted by user");
  process.exit(1);
});

// Run the migration
runMigration();
