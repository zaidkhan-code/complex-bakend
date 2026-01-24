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

// ======================
// CRON: Expire Promotions after End Date/Time
// ======================
const expirePromotions = cron.schedule("*/10 * * * *", async () => {
  try {
    const now = new Date();
    const promotions = await Promotion.findAll({ where: { status: "active" } });

    for (const promo of promotions) {
      const endDateTime = new Date(`${promo.stopDate} ${promo.stopTime}`);
      if (now > endDateTime) {
        promo.status = "expired";
        await promo.save();
        console.log(`⏳ Promotion ${promo.id} expired`);
      }
    }
  } catch (error) {
    console.error("Error in expire cron:", error);
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
