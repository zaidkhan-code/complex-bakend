const cron = require("node-cron");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const Promotion = require("../models/Promotion");
const Business = require("../models/Business");
const { reschedulePromotionJobs } = require("../services/promotionScheduler");

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
      promo.status = "inactive";
      promo.approvedAt = now;
      await promo.save();
      await reschedulePromotionJobs(promo);
      console.log(`Auto-approved promotion ${promo.id} (24h passed)`);
    }
  } catch (error) {
    console.error("Error in auto-approve cron:", error);
  }
});

const runExpirePromotions = async () => {
  try {
    const [result] = await sequelize.query(`
      UPDATE "Promotions"
      SET "status" = 'expired',
          "updatedAt" = NOW()
      WHERE "status" IN ('active', 'inactive', 'pending')
        AND (
          ("scheduleEnabled" = TRUE AND "scheduleEndAt" IS NOT NULL AND "scheduleEndAt" <= NOW())
          OR ("scheduleEnabled" = FALSE AND "stopDate" < CURRENT_DATE)
        )
      RETURNING "id";
    `);

    if (Array.isArray(result) && result.length) {
      console.log(`Expired promotions: ${result.length}`);
    }
  } catch (error) {
    console.error("Error in expire promotions cron:", error);
  }
};

const expirePromotions = cron.schedule("*/10 * * * *", runExpirePromotions);

const startCronJobs = () => {
  autoApprovePendingPromotions.start();
  expirePromotions.start();
  // Run once at startup so already-ended promotions are expired immediately.
  runExpirePromotions().catch((error) =>
    console.error("Error running startup expire check:", error),
  );
  console.log("All cron jobs started");
};

const stopCronJobs = () => {
  autoApprovePendingPromotions.stop();
  expirePromotions.stop();
  console.log("All cron jobs stopped");
};

module.exports = { startCronJobs, stopCronJobs };
