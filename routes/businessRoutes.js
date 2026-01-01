const express = require('express');
const router = express.Router();
const {
  createPromotion,
  getBusinessPromotions,
  updatePromotion,
  deletePromotion,
  getDashboard
} = require('../controllers/businessController');
const { protect, businessOnly } = require('../middleware/authMiddleware');
const { validatePromotion } = require('../middleware/validationMiddleware');

router.use(protect);
router.use(businessOnly);

router.get('/dashboard', getDashboard);
router.post('/promotions', validatePromotion, createPromotion);
router.get('/promotions', getBusinessPromotions);
router.put('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);

module.exports = router;