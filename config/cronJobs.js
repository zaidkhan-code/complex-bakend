const cron = require('node-cron');
const { Op } = require('sequelize');
const Promotion = require('../models/Promotion');

// Run every day at midnight
const deactivateExpiredPromotions = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running cron job: Deactivate expired promotions');
    
    const now = new Date();
    
    // Find and update expired promotions
    const result = await Promotion.update(
      { status: 'inactive' },
      {
        where: {
          status: 'active',
          [Op.or]: [
            {
              stopDate: {
                [Op.lt]: now
              }
            },
            {
              stopDate: now,
              stopTime: {
                [Op.lt]: now.toTimeString().slice(0, 5)
              }
            }
          ]
        }
      }
    );
    
    console.log(`Deactivated ${result[0]} expired promotions`);
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

const startCronJobs = () => {
  deactivateExpiredPromotions.start();
  console.log('Cron jobs started');
};

const stopCronJobs = () => {
  deactivateExpiredPromotions.stop();
  console.log('Cron jobs stopped');
};

module.exports = { startCronJobs, stopCronJobs };