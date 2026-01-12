/**
 * Migration: Add Promotion Approval Fields (status, autoApprove, approvedAt, paymentStatus)
 * Description: Adds fields to support promotion approval workflow (pending → active transition)
 * Direction: UP
 */

module.exports = {
  up: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log(
        "🔄 Adding promotion approval fields (status, autoApprove, approvedAt, paymentStatus)..."
      );

      // Add status column with ENUM (active, inactive, pending)
      await queryInterface.addColumn("Promotions", "status", {
        type: sequelize.Sequelize.ENUM("active", "inactive", "pending"),
        defaultValue: "pending",
        allowNull: false,
      });

      // Add autoApprove column
      await queryInterface.addColumn("Promotions", "autoApprove", {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false,
        comment:
          "If true, promotion will be auto-activated after 24 hours (can be overridden by admin)",
      });

      // Add approvedAt column for approval timestamp
      await queryInterface.addColumn("Promotions", "approvedAt", {
        type: sequelize.Sequelize.DATE,
        allowNull: true,
        comment:
          "Timestamp when promotion was approved/activated by admin or auto-activated",
      });

      // Add paymentStatus column to track Stripe payment
      await queryInterface.addColumn("Promotions", "paymentStatus", {
        type: sequelize.Sequelize.ENUM("pending", "completed", "failed"),
        defaultValue: "pending",
        comment: "Payment status from Stripe",
      });

      console.log("✅ Promotion approval fields added successfully!");
    } catch (error) {
      console.error("❌ Error adding promotion approval fields:", error);
      throw error;
    }
  },

  down: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log(
        "🔄 Removing promotion approval fields (status, autoApprove, approvedAt, paymentStatus)..."
      );

      await queryInterface.removeColumn("Promotions", "status");
      await queryInterface.removeColumn("Promotions", "autoApprove");
      await queryInterface.removeColumn("Promotions", "approvedAt");
      await queryInterface.removeColumn("Promotions", "paymentStatus");

      console.log("✅ Promotion approval fields removed successfully!");
    } catch (error) {
      console.error("❌ Error removing promotion approval fields:", error);
      throw error;
    }
  },
};
