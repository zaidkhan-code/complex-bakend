const cron = require("node-cron");
const { Op } = require("sequelize");
const Promotion = require("../models/Promotion");

// Run every day at midnight - Deactivate expired promotions
const deactivateExpiredPromotions = cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running cron job: Deactivate expired promotions");

    const now = new Date();

    // Find and update expired promotions
    const result = await Promotion.update(
      { status: "inactive" },
      {
        where: {
          status: "active",
          [Op.or]: [
            {
              stopDate: {
                [Op.lt]: now,
              },
            },
            {
              stopDate: now,
              stopTime: {
                [Op.lt]: now.toTimeString().slice(0, 5),
              },
            },
          ],
        },
      }
    );

    console.log(`✅ Deactivated ${result[0]} expired promotions`);
  } catch (error) {
    console.error("Error in cron job (deactivate expired):", error);
  }
});

// Run every hour - Auto-activate pending promotions after 24 hours
const autoActivatePendingPromotions = cron.schedule("0 * * * *", async () => {
  try {
    console.log("Running cron job: Auto-activate pending promotions");

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find pending promotions created more than 24 hours ago (and not already approved)
    const promotionsToActivate = await Promotion.findAll({
      where: {
        status: "pending",
        paymentStatus: "completed",
        approvedAt: null, // Not yet approved by admin
        createdAt: {
          [Op.lte]: twentyFourHoursAgo,
        },
      },
    });

    if (promotionsToActivate.length > 0) {
      for (const promotion of promotionsToActivate) {
        promotion.status = "active";
        promotion.approvedAt = now;
        await promotion.save();
        console.log(
          `✅ Auto-activated promotion ${promotion.id} (24 hours passed)`
        );
      }
      console.log(
        `✅ Auto-activated ${promotionsToActivate.length} pending promotions`
      );
    } else {
      console.log("No pending promotions to auto-activate");
    }
  } catch (error) {
    console.error("Error in cron job (auto-activate):", error);
  }
});

const startCronJobs = () => {
  deactivateExpiredPromotions.start();
  autoActivatePendingPromotions.start();
  console.log("✅ All cron jobs started");
};

const stopCronJobs = () => {
  deactivateExpiredPromotions.stop();
  autoActivatePendingPromotions.stop();
  console.log("✅ All cron jobs stopped");
};

module.exports = { startCronJobs, stopCronJobs };
