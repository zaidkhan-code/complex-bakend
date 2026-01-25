const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();

      /* ======================================================
         1️⃣ CREATE SubscriptionHistories TABLE
      ====================================================== */
      if (!tables.includes("SubscriptionHistories")) {
        await queryInterface.createTable(
          "SubscriptionHistories",
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

            stripeSubscriptionId: {
              type: DataTypes.STRING,
              allowNull: true,
            },

            stripePriceId: {
              type: DataTypes.STRING,
              allowNull: true,
            },

            businessType: {
              type: DataTypes.STRING,
              allowNull: true,
            },

            months: {
              type: DataTypes.INTEGER,
              allowNull: true,
            },

            startDate: {
              type: DataTypes.DATE,
              allowNull: true,
            },

            endDate: {
              type: DataTypes.DATE,
              allowNull: true,
            },

            status: {
              type: DataTypes.ENUM("active", "expired", "canceled"),
              defaultValue: "active",
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
          { transaction },
        );
      }

      /* ======================================================
         2️⃣ ADD SUBSCRIPTION FIELDS TO Businesses TABLE
      ====================================================== */
      const businessTable = await queryInterface.describeTable("Businesses");

      if (!businessTable.subscriptionStatus) {
        await queryInterface.addColumn(
          "Businesses",
          "subscriptionStatus",
          {
            type: DataTypes.ENUM("active", "expired", "canceled", "none"),
            defaultValue: "none",
          },
          { transaction },
        );
      }

      if (!businessTable.subscriptionStart) {
        await queryInterface.addColumn(
          "Businesses",
          "subscriptionStart",
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!businessTable.subscriptionEnd) {
        await queryInterface.addColumn(
          "Businesses",
          "subscriptionEnd",
          {
            type: DataTypes.DATE,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!businessTable.stripeSubscriptionId) {
        await queryInterface.addColumn(
          "Businesses",
          "stripeSubscriptionId",
          {
            type: DataTypes.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (!businessTable.stripeCustomerId) {
        await queryInterface.addColumn(
          "Businesses",
          "stripeCustomerId",
          {
            type: DataTypes.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      await transaction.commit();
      console.log("✅ Business subscription migration applied successfully");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      /* ======================================================
         REMOVE COLUMNS FROM Businesses
      ====================================================== */
      const businessTable = await queryInterface.describeTable("Businesses");

      if (businessTable.stripeCustomerId) {
        await queryInterface.removeColumn("Businesses", "stripeCustomerId", {
          transaction,
        });
      }

      if (businessTable.stripeSubscriptionId) {
        await queryInterface.removeColumn(
          "Businesses",
          "stripeSubscriptionId",
          { transaction },
        );
      }

      if (businessTable.subscriptionEnd) {
        await queryInterface.removeColumn("Businesses", "subscriptionEnd", {
          transaction,
        });
      }

      if (businessTable.subscriptionStart) {
        await queryInterface.removeColumn("Businesses", "subscriptionStart", {
          transaction,
        });
      }

      if (businessTable.subscriptionStatus) {
        await queryInterface.removeColumn("Businesses", "subscriptionStatus", {
          transaction,
        });
      }

      /* ======================================================
         DROP SubscriptionHistories TABLE
      ====================================================== */
      await queryInterface.dropTable("SubscriptionHistories", { transaction });

      await transaction.commit();
      console.log("✅ Business subscription migration reverted successfully");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration rollback failed:", error);
      throw error;
    }
  },
};
