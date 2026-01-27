const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();

      /* ======================================================
         1️⃣ CREATE SubscriptionTemplates TABLE
      ====================================================== */
      if (!tables.includes("SubscriptionTemplates")) {
        await queryInterface.createTable(
          "SubscriptionTemplates",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            name: {
              type: DataTypes.STRING,
              allowNull: false,
            },
            durationMonths: {
              type: DataTypes.INTEGER,
              allowNull: false,
            },
            price: {
              type: DataTypes.DECIMAL(10, 2),
              allowNull: false,
            },
            freeCities: {
              type: DataTypes.INTEGER,
              defaultValue: 2,
            },
            freeStates: {
              type: DataTypes.INTEGER,
              defaultValue: 0,
            },
            freeTimezones: {
              type: DataTypes.INTEGER,
              defaultValue: 0,
            },
            isActive: {
              type: DataTypes.BOOLEAN,
              defaultValue: true,
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("NOW()"),
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("NOW()"),
            },
          },
          { transaction },
        );
        console.log("✅ SubscriptionTemplates table created");
      }

      /* ======================================================
         2️⃣ CREATE BusinessSubscriptions TABLE
      ====================================================== */
      if (!tables.includes("BusinessSubscriptions")) {
        await queryInterface.createTable(
          "BusinessSubscriptions",
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            businessId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "Businesses",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            subscriptionTemplateId: {
              type: DataTypes.UUID,
              allowNull: false,
              references: {
                model: "SubscriptionTemplates",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            startDate: {
              type: DataTypes.DATE,
              allowNull: true,
            },
            endDate: {
              type: DataTypes.DATE,
              allowNull: true,
            },
            freeCities: {
              type: DataTypes.INTEGER,
              allowNull: true,
            },
            freeStates: {
              type: DataTypes.INTEGER,
              allowNull: true,
            },
            freeTimezones: {
              type: DataTypes.INTEGER,
              allowNull: true,
            },
            status: {
              type: DataTypes.ENUM("active", "expired", "canceled"),
              defaultValue: "active",
            },
            stripeSubscriptionId: {
              type: DataTypes.STRING,
              allowNull: true,
            },
            createdAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("NOW()"),
            },
            updatedAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("NOW()"),
            },
          },
          { transaction },
        );
        console.log("✅ BusinessSubscriptions table created");
      }

      await transaction.commit();
      console.log(
        "✅ SubscriptionTemplate & BusinessSubscription migration applied successfully",
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();

      /* ======================================================
         DROP BusinessSubscriptions TABLE
      ====================================================== */
      if (tables.includes("BusinessSubscriptions")) {
        await queryInterface.dropTable("BusinessSubscriptions", {
          transaction,
        });
      }

      /* ======================================================
         DROP SubscriptionTemplates TABLE
      ====================================================== */
      if (tables.includes("SubscriptionTemplates")) {
        await queryInterface.dropTable("SubscriptionTemplates", {
          transaction,
        });
      }

      await transaction.commit();
      console.log(
        "✅ SubscriptionTemplate & BusinessSubscription migration reverted successfully",
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration rollback failed:", error);
      throw error;
    }
  },
};
