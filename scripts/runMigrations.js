#!/usr/bin/env node

/**
 * Complete Migration Runner
 * Usage: npm run migrate:complete
 *
 * This script runs ALL migrations in order and sets up the complete system
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { sequelize, connectDB } = require("../config/db");

const migrationsDir = path.join(__dirname, "../migrations");

// Get all migration files and sort them
function getMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".js"))
    .sort()
    .map((file) => ({
      name: file,
      path: path.join(migrationsDir, file),
    }));
}

async function runMigrations() {
  try {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║        Complete Database Migration Runner v1.0     ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    // Connect to database
    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected\n");

    // Get migration files
    const migrations = getMigrationFiles();

    if (migrations.length === 0) {
      console.log("⚠️  No migration files found");
      process.exit(0);
    }

    console.log(`📋 Found ${migrations.length} migration file(s):\n`);
    migrations.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name}`);
    });
    console.log();

    // Create SequelizeMeta table if it doesn't exist
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
          "name" VARCHAR(255) PRIMARY KEY,
          "createdAt" TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL
        );
      `);
      console.log("✅ SequelizeMeta table ready\n");
    } catch (error) {
      console.log("⚠️  SequelizeMeta table already exists\n");
    }

    // Run each migration
    for (const migration of migrations) {
      try {
        console.log(`🔄 Running migration: ${migration.name}`);

        // Check if migration was already run
        const [results] = await sequelize.query(
          'SELECT * FROM "SequelizeMeta" WHERE name = ?',
          { replacements: [migration.name] }
        );

        if (results.length > 0) {
          console.log(`   ⏭️  Already executed, skipping\n`);
          continue;
        }

        // Load and run migration
        const migrationModule = require(migration.path);

        if (migrationModule.up) {
          const queryInterface = sequelize.getQueryInterface();
          await migrationModule.up(queryInterface);

          // Record migration
          await sequelize.query(
            'INSERT INTO "SequelizeMeta" (name) VALUES (?)',
            { replacements: [migration.name] }
          );

          console.log(`✅ Migration completed\n`);
        }
      } catch (error) {
        console.error(
          `❌ Migration failed: ${migration.name}\n   Error: ${error.message}\n`
        );
        throw error;
      }
    }

    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║          ✅ All migrations completed!             ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    console.log("📊 Migration Summary:");
    console.log(`   Total migrations: ${migrations.length}`);
    console.log(`   Status: All completed successfully`);
    console.log("\n✨ Database schema is ready for use!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
