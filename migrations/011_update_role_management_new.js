const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log("🔄 Migration up: Starting role management update...");

      // Get list of existing tables
      const tables = await queryInterface.showAllTables();

      // Step 1: Create/Update Roles table with new structure
      if (!tables.includes("Roles")) {
        console.log("📝 Creating Roles table...");
        await queryInterface.createTable(
          "Roles",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            name: {
              type: DataTypes.STRING,
              allowNull: false,
              unique: true,
            },
            permissions: {
              type: DataTypes.JSONB,
              allowNull: false,
              defaultValue: {},
              comment:
                "JSON object containing module permissions: { module: [action1, action2] }",
            },
            isSystem: {
              type: DataTypes.BOOLEAN,
              defaultValue: false,
              comment: "System roles cannot be deleted",
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
          },
          { transaction },
        );
        console.log("✅ Roles table created");
      } else {
        console.log("📝 Updating Roles table...");
        // Check if permissions column exists and if it's the right type
        const rolesDescription = await queryInterface.describeTable("Roles");

        // Remove old enum constraint on name if it exists
        if (
          rolesDescription.name &&
          rolesDescription.name.type === "USER-DEFINED"
        ) {
          // PostgreSQL enum, we need to handle this carefully
          try {
            // Check if the enum constraint is there and convert to TEXT if needed
            const result = await queryInterface.sequelize.query(`
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_name = 'Roles' AND column_name = 'name'
            `);

            if (
              result[0] &&
              result[0][0] &&
              result[0][0].data_type === "character varying"
            ) {
              console.log("✓ Name column already flexible (VARCHAR)");
            }
          } catch (e) {
            console.log("ℹ Name column check skipped");
          }
        }

        // Add permissions column if it doesn't exist
        if (!rolesDescription.permissions) {
          console.log("  Adding permissions column...");
          await queryInterface.addColumn(
            "Roles",
            "permissions",
            {
              type: DataTypes.JSONB,
              allowNull: false,
              defaultValue: {},
            },
            { transaction },
          );
        }

        // Add isSystem column if it doesn't exist
        if (!rolesDescription.isSystem) {
          console.log("  Adding isSystem column...");
          await queryInterface.addColumn(
            "Roles",
            "isSystem",
            {
              type: DataTypes.BOOLEAN,
              defaultValue: false,
            },
            { transaction },
          );
        }

        // Remove old columns if they exist
        if (rolesDescription.description) {
          console.log("  Removing old description column...");
          await queryInterface.removeColumn("Roles", "description", {
            transaction,
          });
        }
      }

      // Step 2: Update Users table
      console.log("📝 Updating Users table...");
      const userTableDescription = await queryInterface.describeTable("Users");

      // Add roleId column if it doesn't exist
      if (!userTableDescription.roleId) {
        console.log("  Adding roleId column...");
        await queryInterface.addColumn(
          "Users",
          "roleId",
          {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
              model: "Roles",
              key: "id",
            },
            onDelete: "SET NULL",
          },
          { transaction },
        );
      }

      // Add isSuperAdmin column if it doesn't exist
      if (!userTableDescription.isSuperAdmin) {
        console.log("  Adding isSuperAdmin column...");
        await queryInterface.addColumn(
          "Users",
          "isSuperAdmin",
          {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: "SuperAdmin users have all permissions",
          },
          { transaction },
        );
      }

      // Add accountType column if it doesn't exist
      if (!userTableDescription.accountType) {
        console.log("  Adding accountType column...");
        await queryInterface.addColumn(
          "Users",
          "accountType",
          {
            type: DataTypes.ENUM("user", "business", "admin"),
            defaultValue: "user",
            comment: "Distinguishes between user, business, and admin accounts",
          },
          { transaction },
        );
      }

      // Step 3: Create seed system roles if Roles table was just created
      if (!tables.includes("Roles")) {
        console.log("📝 Seeding system roles...");
        const superAdminRole = {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "Super Admin",
          permissions: {
            roles: ["view", "create", "edit", "delete"],
            users: ["view", "edit", "block"],
            businesses: ["view", "edit", "approve"],
            promotions: ["view", "edit", "delete"],
            templates: ["view", "create", "edit", "delete"],
            categories: ["view", "create", "edit", "delete"],
          },
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const contentModeratorRole = {
          id: "550e8400-e29b-41d4-a716-446655440001",
          name: "Content Moderator",
          permissions: {
            promotions: ["view", "edit", "delete"],
            templates: ["view"],
            categories: ["view"],
          },
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const businessManagerRole = {
          id: "550e8400-e29b-41d4-a716-446655440002",
          name: "Business Manager",
          permissions: {
            businesses: ["view", "edit"],
            promotions: ["view"],
            users: ["view"],
          },
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          await queryInterface.bulkInsert(
            "Roles",
            [superAdminRole, contentModeratorRole, businessManagerRole],
            { transaction },
          );
          console.log("✅ System roles seeded");
        } catch (e) {
          console.log("ℹ System roles may already exist:", e.message);
        }
      }

      // Step 4: Clean up old tables if they exist (from old migration)
      console.log("📝 Cleaning up old tables...");
      const oldTables = ["RolePermissions", "UserRoles", "Permissions"];

      for (const table of oldTables) {
        if (tables.includes(table)) {
          console.log(`  Dropping ${table} table...`);
          try {
            await queryInterface.dropTable(table, { transaction });
          } catch (e) {
            console.log(`  ℹ Could not drop ${table}:`, e.message);
          }
        }
      }

      await transaction.commit();
      console.log("✅ Migration up completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration up failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log("🔄 Migration down: Reverting role management changes...");

      const userTableDescription = await queryInterface.describeTable("Users");

      // Remove columns from Users table
      if (userTableDescription.roleId) {
        console.log("  Removing roleId column...");
        await queryInterface.removeColumn("Users", "roleId", { transaction });
      }

      if (userTableDescription.isSuperAdmin) {
        console.log("  Removing isSuperAdmin column...");
        await queryInterface.removeColumn("Users", "isSuperAdmin", {
          transaction,
        });
      }

      if (userTableDescription.accountType) {
        console.log("  Removing accountType column...");
        await queryInterface.removeColumn("Users", "accountType", {
          transaction,
        });
      }

      // Drop Roles table
      const tables = await queryInterface.showAllTables();
      if (tables.includes("Roles")) {
        console.log("  Dropping Roles table...");
        await queryInterface.dropTable("Roles", { transaction });
      }

      await transaction.commit();
      console.log("✅ Migration down completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration down failed:", error);
      throw error;
    }
  },
};
