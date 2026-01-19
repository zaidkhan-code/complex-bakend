const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Get list of existing tables
      const tables = await queryInterface.showAllTables();

      // Create Roles table (if it doesn't exist)
      if (!tables.includes("Roles")) {
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
              enum: ["superadmin", "admin", "moderator"],
            },
            description: {
              type: DataTypes.TEXT,
              allowNull: true,
            },
            isSystem: {
              type: DataTypes.BOOLEAN,
              defaultValue: false,
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction }
        );
      }

      // Create Permissions table (if it doesn't exist)
      if (!tables.includes("Permissions")) {
        await queryInterface.createTable(
          "Permissions",
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
            description: {
              type: DataTypes.TEXT,
              allowNull: true,
            },
            module: {
              type: DataTypes.ENUM(
                "users",
                "businesses",
                "promotions",
                "admin"
              ),
              allowNull: false,
            },
            action: {
              type: DataTypes.ENUM(
                "view",
                "create",
                "edit",
                "delete",
                "approve"
              ),
              allowNull: false,
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction }
        );
      }

      // Create UserRoles junction table (if it doesn't exist)
      if (!tables.includes("UserRoles")) {
        await queryInterface.createTable(
          "UserRoles",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            UserId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "Users",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            RoleId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "Roles",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction }
        );
      }

      // Create RolePermissions junction table (if it doesn't exist)
      if (!tables.includes("RolePermissions")) {
        await queryInterface.createTable(
          "RolePermissions",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            RoleId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "Roles",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            PermissionId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "Permissions",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction }
        );
      }

      // Add new columns to Users table (if they don't exist)
      const userTableDescription = await queryInterface.describeTable("Users");

      if (!userTableDescription.accountType) {
        await queryInterface.addColumn(
          "Users",
          "accountType",
          {
            type: DataTypes.ENUM("user", "business", "admin"),
            defaultValue: "user",
          },
          { transaction }
        );
      }

      if (!userTableDescription.isSuperAdmin) {
        await queryInterface.addColumn(
          "Users",
          "isSuperAdmin",
          {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          { transaction }
        );
      }

      if (!userTableDescription.permissions) {
        await queryInterface.addColumn(
          "Users",
          "permissions",
          {
            type: DataTypes.JSON,
            defaultValue: {},
          },
          { transaction }
        );
      }

      await transaction.commit();
      console.log(
        "✅ Migration up: Role management tables created successfully"
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration up failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop columns from Users table (if they exist)
      const userTableDescription = await queryInterface.describeTable("Users");

      if (userTableDescription.permissions) {
        await queryInterface.removeColumn("Users", "permissions", {
          transaction,
        });
      }

      if (userTableDescription.isSuperAdmin) {
        await queryInterface.removeColumn("Users", "isSuperAdmin", {
          transaction,
        });
      }

      if (userTableDescription.accountType) {
        await queryInterface.removeColumn("Users", "accountType", {
          transaction,
        });
      }

      // Drop junction tables first
      await queryInterface.dropTable("RolePermissions", { transaction });
      await queryInterface.dropTable("UserRoles", { transaction });

      // Drop main tables
      await queryInterface.dropTable("Permissions", { transaction });
      await queryInterface.dropTable("Roles", { transaction });

      await transaction.commit();
      console.log(
        "✅ Migration down: Role management tables dropped successfully"
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration down failed:", error);
      throw error;
    }
  },
};
