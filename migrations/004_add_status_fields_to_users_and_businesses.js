/**
 * Migration: Add Status Fields to Users and Businesses
 * Description: Adds status enum field to Users and Businesses tables for admin management
 *              Also updates Users table to use fullName instead of name
 * Direction: UP
 */

module.exports = {
  up: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log("🔄 Adding status fields to Users and Businesses tables...");

      // Check if fullName column exists in Users table, if not add it
      const userTable = await queryInterface.describeTable("Users");
      if (!userTable.fullName) {
        console.log("  - Adding fullName column to Users table...");
        await queryInterface.addColumn("Users", "fullName", {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
          defaultValue: userTable.name
            ? sequelize.Sequelize.col("name")
            : "User",
        });
      }

      // Add status column to Users table if it doesn't exist
      if (!userTable.status) {
        console.log("  - Adding status column to Users table...");
        await queryInterface.addColumn("Users", "status", {
          type: sequelize.Sequelize.ENUM(
            "active",
            "inactive",
            "blocked",
            "suspended"
          ),
          defaultValue: "active",
          allowNull: false,
          comment: "User account status for admin management",
        });
      }

      // Add status column to Businesses table if it doesn't exist
      const businessTable = await queryInterface.describeTable("Businesses");
      if (!businessTable.status) {
        console.log("  - Adding status column to Businesses table...");
        await queryInterface.addColumn("Businesses", "status", {
          type: sequelize.Sequelize.ENUM(
            "active",
            "inactive",
            "blocked",
            "suspended"
          ),
          defaultValue: "active",
          allowNull: false,
          comment: "Business account status for admin management",
        });

        // If isBlocked column exists, set status based on isBlocked value
        if (businessTable.isBlocked) {
          console.log(
            "  - Migrating isBlocked values to status field in Businesses..."
          );
          await queryInterface.sequelize.query(`
            UPDATE "Businesses" 
            SET status = CASE 
              WHEN "isBlocked" = true THEN 'blocked'
              ELSE 'active'
            END
            WHERE status = 'active'
          `);

          console.log("  - Removing isBlocked column from Businesses table...");
          await queryInterface.removeColumn("Businesses", "isBlocked");
        }
      }

      console.log(
        "✅ Status fields added successfully to Users and Businesses!"
      );
    } catch (error) {
      console.error(
        "❌ Error adding status fields to Users and Businesses:",
        error
      );
      throw error;
    }
  },

  down: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log(
        "🔄 Removing status fields from Users and Businesses tables..."
      );

      const userTable = await queryInterface.describeTable("Users");
      if (userTable.status) {
        await queryInterface.removeColumn("Users", "status");
      }

      const businessTable = await queryInterface.describeTable("Businesses");
      if (businessTable.status) {
        // Add back isBlocked column before removing status
        console.log("  - Adding back isBlocked column to Businesses table...");
        await queryInterface.addColumn("Businesses", "isBlocked", {
          type: sequelize.Sequelize.BOOLEAN,
          defaultValue: false,
        });

        // Migrate status back to isBlocked
        console.log("  - Migrating status values back to isBlocked field...");
        await queryInterface.sequelize.query(`
          UPDATE "Businesses" 
          SET "isBlocked" = CASE 
            WHEN status = 'blocked' THEN true
            ELSE false
          END
        `);

        await queryInterface.removeColumn("Businesses", "status");
      }

      console.log(
        "✅ Status fields removed successfully from Users and Businesses!"
      );
    } catch (error) {
      console.error(
        "❌ Error removing status fields from Users and Businesses:",
        error
      );
      throw error;
    }
  },
};
