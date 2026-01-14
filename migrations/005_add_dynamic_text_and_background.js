/**
 * Migration: Add backgroundColor to Promotions
 * Description: Adds backgroundColor field to support promotion card styling
 */

module.exports = {
  up: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log("🔄 Adding backgroundColor column to Promotions...");

      // Get existing columns in Promotions table
      const tableInfo = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='Promotions';`,
        { type: sequelize.Sequelize.QueryTypes.SELECT }
      );
      const existingColumns = tableInfo.map((c) => c.column_name);

      // Add backgroundColor if it doesn't exist
      if (!existingColumns.includes("backgroundColor")) {
        await queryInterface.addColumn("Promotions", "backgroundColor", {
          type: sequelize.Sequelize.STRING,
          defaultValue: "",
          comment: "Background color for the promotion card",
        });
        console.log("✅ backgroundColor column added successfully!");
      } else {
        console.log("ℹ️ backgroundColor column already exists, skipping.");
      }
    } catch (error) {
      console.error("❌ Error adding backgroundColor column:", error);
      throw error;
    }
  },

  down: async (sequelize) => {
    const queryInterface = sequelize.getQueryInterface();

    try {
      console.log("🔄 Removing backgroundColor column from Promotions...");

      const tableInfo = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='Promotions';`,
        { type: sequelize.Sequelize.QueryTypes.SELECT }
      );
      const existingColumns = tableInfo.map((c) => c.column_name);

      if (existingColumns.includes("backgroundColor")) {
        await queryInterface.removeColumn("Promotions", "backgroundColor");
        console.log("✅ backgroundColor column removed successfully!");
      } else {
        console.log("ℹ️ backgroundColor column does not exist, skipping.");
      }
    } catch (error) {
      console.error("❌ Error removing backgroundColor column:", error);
      throw error;
    }
  },
};
