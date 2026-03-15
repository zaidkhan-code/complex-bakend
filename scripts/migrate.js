const fs = require("fs");
const path = require("path");
const { sequelize } = require("../config/db");

/**
 * Migration System for Database Schema Management
 * Tracks executed migrations and prevents duplicate runs
 */

const MIGRATIONS_DIR = path.join(__dirname, "..");
const migrationsFolder = path.join(MIGRATIONS_DIR, "migrations");

/**
 * Create migrations tracking table if it doesn't exist
 */
const initMigrationsTable = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await queryInterface.createTable(
      "SequelizeMeta",
      {
        name: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
          unique: true,
          primaryKey: true,
        },
        executedAt: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.fn("NOW"),
        },
      },
      { timestamps: false },
    );
    console.log("âœ… Migration tracking table created");
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return;
    }
    if (error.message.includes("already exists")) {
      return;
    }
    throw error;
  }
};

/**
 * Get list of already executed migrations
 */
const getExecutedMigrations = async () => {
  try {
    const result = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY "executedAt" ASC',
      { raw: true },
    );
    return result[0].map((r) => r.name);
  } catch (error) {
    return [];
  }
};

/**
 * Record a migration as executed
 */
const recordMigration = async (migrationName) => {
  await sequelize.query(
    `INSERT INTO "SequelizeMeta" (name, "executedAt") VALUES (:name, NOW())`,
    {
      replacements: { name: migrationName },
      type: sequelize.Sequelize.QueryTypes.INSERT,
    },
  );
};

/**
 * Remove a migration record (for rollback)
 */
const removeMigration = async (migrationName) => {
  await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name = :name`, {
    replacements: { name: migrationName },
    type: sequelize.Sequelize.QueryTypes.DELETE,
  });
};

/**
 * Get all migration files in order
 */
const getMigrationFiles = () => {
  if (!fs.existsSync(migrationsFolder)) {
    return [];
  }

  return fs
    .readdirSync(migrationsFolder)
    .filter((file) => file.endsWith(".js"))
    .sort();
};

/**
 * Run all pending migrations
 */
const runMigrations = async () => {
  try {
    await sequelize.authenticate();
    console.log("âœ… Database connected");

    await initMigrationsTable();

    const executedMigrations = await getExecutedMigrations();
    const allMigrations = getMigrationFiles();
    const pendingMigrations = allMigrations.filter(
      (m) => !executedMigrations.includes(m),
    );

    if (pendingMigrations.length === 0) {
      console.log("âœ… All migrations are up to date");
      return;
    }

    console.log(
      `\nðŸ“‹ Found ${pendingMigrations.length} pending migration(s):\n`,
    );

    for (const migration of pendingMigrations) {
      try {
        console.log(`â–¶ï¸  Running migration: ${migration}`);
        const migrationModule = require(path.join(migrationsFolder, migration));

        if (typeof migrationModule.up === "function") {
          const queryInterface = sequelize.getQueryInterface();
          await migrationModule.up(queryInterface, sequelize.Sequelize);
          await recordMigration(migration);
          console.log(`âœ… Migration complete: ${migration}\n`);
        } else {
          console.error(`âŒ Migration ${migration} has no up function`);
        }
      } catch (error) {
        console.error(`âŒ Error running migration ${migration}:`, error);
        throw error;
      }
    }

    console.log("ðŸŽ‰ All migrations completed successfully!");
  } catch (error) {
    console.error("âŒ Migration failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

/**
 * Rollback last migration
 */
const rollbackMigration = async () => {
  try {
    await sequelize.authenticate();
    console.log("âœ… Database connected");

    await initMigrationsTable();

    const executedMigrations = await getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log("â„¹ï¸  No migrations to rollback");
      return;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];

    try {
      console.log(`â–¶ï¸  Rolling back migration: ${lastMigration}`);
      const migrationModule = require(
        path.join(migrationsFolder, lastMigration),
      );

      if (typeof migrationModule.down === "function") {
        const queryInterface = sequelize.getQueryInterface();
        await migrationModule.down(queryInterface, sequelize.Sequelize);
        await removeMigration(lastMigration);
        console.log(`âœ… Rollback complete: ${lastMigration}`);
      } else {
        console.error(`âŒ Migration ${lastMigration} has no down function`);
      }
    } catch (error) {
      console.error(`âŒ Error rolling back migration ${lastMigration}:`, error);
      throw error;
    }
  } catch (error) {
    console.error("âŒ Rollback failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

/**
 * Show migration status
 */
const showStatus = async () => {
  try {
    await sequelize.authenticate();
    console.log("âœ… Database connected\n");

    await initMigrationsTable();

    const executedMigrations = await getExecutedMigrations();
    const allMigrations = getMigrationFiles();

    console.log("ðŸ“Š Migration Status:\n");
    console.log("Executed Migrations:");
    if (executedMigrations.length === 0) {
      console.log("  (none)");
    } else {
      executedMigrations.forEach((m) => {
        console.log(`  âœ… ${m}`);
      });
    }

    console.log("\nPending Migrations:");
    const pendingMigrations = allMigrations.filter(
      (m) => !executedMigrations.includes(m),
    );
    if (pendingMigrations.length === 0) {
      console.log("  (none)");
    } else {
      pendingMigrations.forEach((m) => {
        console.log(`  â³ ${m}`);
      });
    }
  } catch (error) {
    console.error("âŒ Error checking migration status:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

module.exports = {
  runMigrations,
  rollbackMigration,
  showStatus,
};

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "up":
      runMigrations();
      break;
    case "down":
      rollbackMigration();
      break;
    case "status":
      showStatus();
      break;
    default:
      console.log("Usage:");
      console.log("  npm run migrate up     - Run all pending migrations");
      console.log("  npm run migrate down   - Rollback last migration");
      console.log("  npm run migrate status - Show migration status");
      process.exit(0);
  }
}

