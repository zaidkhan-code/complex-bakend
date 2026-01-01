const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerBusiness,
  login
} = require('../controllers/authController');
const {
  validateUserRegistration,
  validateBusinessRegistration,
  validateLogin
} = require('../middleware/validationMiddleware');

router.post('/register', validateUserRegistration, registerUser);
router.post('/register/business', validateBusinessRegistration, registerBusiness);
router.post('/login', validateLogin, login);

module.exports = router;