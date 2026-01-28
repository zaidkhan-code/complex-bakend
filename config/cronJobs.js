const cron = require("node-cron");
const { Op } = require("sequelize");
const Promotion = require("../models/Promotion");
const Business = require("../models/Business");

const autoApprovePendingPromotions = cron.schedule("*/10 * * * *", async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const promotions = await Promotion.findAll({
      where: {
        status: "pending",
        paymentStatus: "completed",
        createdAt: { [Op.lte]: twentyFourHoursAgo },
      },
      include: [{ model: Business, as: "business" }],
    });

    for (const promo of promotions) {
      promo.status = "inactive"; // Approved but not active
      promo.approvedAt = now;
      await promo.save();
      console.log(`✅ Auto-approved promotion ${promo.id} (24h passed)`);
    }
  } catch (error) {
    console.error("Error in auto-approve cron:", error);
  }
});

const expirePromotions = cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();

    // Today in YYYY-MM-DD (server timezone)
    const today = now.toISOString().split("T")[0];

    const promotions = await Promotion.findAll({
      where: {
        status: {
          [Op.not]: "expired",
        },
        stopDate: {
          [Op.lt]: today, // expired as soon as date rolls over
        },
      },
    });

    for (const promo of promotions) {
      promo.status = "expired";
      await promo.save();

      console.log(`⏳ Promotion expired at 12:00 AM | ID: ${promo.id}`);
    }
  } catch (error) {
    console.error("❌ Error in expire promotions cron:", error);
  }
});
const startCronJobs = () => {
  autoApprovePendingPromotions.start();
  expirePromotions.start();
  console.log("✅ All cron jobs started");
};

const stopCronJobs = () => {
  autoApprovePendingPromotions.stop();
  expirePromotions.stop();
  console.log("✅ All cron jobs stopped");
};

module.exports = { startCronJobs, stopCronJobs };
