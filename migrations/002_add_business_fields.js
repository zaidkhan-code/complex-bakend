/**
 * Migration: Add Business Fields (personName, businessAddress, categories, autoApprovePromotions)
 * Description: Adds new fields to support business registration enhancements
 * Direction: UP
 */

module.exports = {
  up: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log(
        "🔄 Adding business fields (personName, businessAddress, categories, autoApprovePromotions)..."
      );

      // Add personName column if it doesn't exist
      await queryInterface.addColumn("Businesses", "personName", {
        type: sequelize.Sequelize.STRING,
        allowNull: true,
        comment: "Contact person name",
      });

      // Add businessAddress column if it doesn't exist
      await queryInterface.addColumn("Businesses", "businessAddress", {
        type: sequelize.Sequelize.TEXT,
        allowNull: true,
        comment: "Full business address",
      });

      // Add categories column (JSONB for storing array of 1-2 categories)
      await queryInterface.addColumn("Businesses", "categories", {
        type: sequelize.Sequelize.JSONB,
        defaultValue: [],
        comment: "Array of selected categories (max 2)",
      });

      // Add autoApprovePromotions column
      await queryInterface.addColumn("Businesses", "autoApprovePromotions", {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "If true, all promotions from this business are auto-approved",
      });

      console.log("✅ Business fields added successfully!");
    } catch (error) {
      console.error("❌ Error adding business fields:", error);
      throw error;
    }
  },

  down: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log(
        "🔄 Removing business fields (personName, businessAddress, categories, autoApprovePromotions)..."
      );

      await queryInterface.removeColumn("Businesses", "personName");
      await queryInterface.removeColumn("Businesses", "businessAddress");
      await queryInterface.removeColumn("Businesses", "categories");
      await queryInterface.removeColumn("Businesses", "autoApprovePromotions");

      console.log("✅ Business fields removed successfully!");
    } catch (error) {
      console.error("❌ Error removing business fields:", error);
      throw error;
    }
  },
};
