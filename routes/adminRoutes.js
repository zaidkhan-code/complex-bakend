const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getAllBusinesses,
  toggleUserBlock,
  toggleBusinessBlock,
  getAllPromotions,
  deletePromotion,
  getAdminDashboard
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.get('/businesses', getAllBusinesses);
router.put('/users/:id/block', toggleUserBlock);
router.put('/businesses/:id/block', toggleBusinessBlock);
router.get('/promotions', getAllPromotions);
router.delete('/promotions/:id', deletePromotion);

module.exports = router;