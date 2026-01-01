const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  handleWebhook,
  verifyPayment
} = require('../controllers/paymentController');
const { protect, businessOnly } = require('../middleware/authMiddleware');

// Webhook route must be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.use(protect);
router.use(businessOnly);

router.post('/stripe', createCheckoutSession);
router.get('/verify/:sessionId', verifyPayment);

module.exports = router;