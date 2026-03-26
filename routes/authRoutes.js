const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerBusiness,
  login,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const {
  validateUserRegistration,
  validateBusinessRegistration,
  validateLogin,
  validateForgotPasswordRequest,
  validateResetPasswordRequest,
} = require('../middleware/validationMiddleware');

router.post('/register', validateUserRegistration, registerUser);
router.post('/register/business', validateBusinessRegistration, registerBusiness);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPasswordRequest, forgotPassword);
router.post('/reset-password', validateResetPasswordRequest, resetPassword);

module.exports = router;
