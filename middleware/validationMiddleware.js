const { body, validationResult } = require("express-validator");

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate,
];

// Business registration validation
const validateBusinessRegistration = [
  body("name").trim().notEmpty().withMessage("Business name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  validate,
];

// Login validation
const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

// Promotion creation validation
const validatePromotion = [
  body("imageUrl").trim().notEmpty().withMessage("Image URL is required"),
  body("runDate").isDate().withMessage("Valid run date is required"),
  body("stopDate").isDate().withMessage("Valid stop date is required"),
  body("runTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Valid run time is required (HH:MM)"),
  body("stopTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Valid stop time is required (HH:MM)"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  validate,
];

module.exports = {
  validate,
  validateUserRegistration,
  validateBusinessRegistration,
  validateLogin,
  validatePromotion,
};
