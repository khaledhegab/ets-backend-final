const express = require("express");
const { body, validationResult } = require("express-validator");
const UsersController = require("../controllers/users.controller");
const auth = require("../middleware/auth");

const router = express.Router();

// Validation middleware
const validateStartTrip = [
  body("number_of_clients")
    .isInt({ min: 1, max: 10 })
    .withMessage("Number of clients must be between 1 and 10"),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

router.post(
  "/start-trip",
  auth,
  validateStartTrip,
  handleValidationErrors,
  UsersController.startTrip
);

// Validation middleware for recharge balance
const validateRechargeBalance = [
  body("Event.Code").isInt().withMessage("Event code is required"),
  body("Event.Name").isString().withMessage("Event name is required"),
  body("Data.Invoice.Id").isString().withMessage("Invoice ID is required"),
  body("Data.Invoice.Status")
    .isString()
    .withMessage("Invoice status is required"),
  body("Data.Transaction.Status")
    .isString()
    .withMessage("Transaction status is required"),
  body("Data.Invoice.ExternalIdentifier")
    .isString()
    .withMessage("External identifier is required"),
  body("Data.Amount.ValueInBaseCurrency")
    .isString()
    .withMessage("Amount is required"),
];

router.post(
  "/recharge-balance",
  validateRechargeBalance,
  handleValidationErrors,
  UsersController.rechargeBalance
);

// Validation middleware for find route
const validateFindRoute = [
  body("start_lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Start latitude must be between -90 and 90"),
  body("start_long")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Start longitude must be between -180 and 180"),
  body("arrival_lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Arrival latitude must be between -90 and 90"),
  body("arrival_long")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Arrival longitude must be between -180 and 180"),
];

router.post(
  "/find-route",
  auth,
  validateFindRoute,
  handleValidationErrors,
  UsersController.findRoute
);

module.exports = router;
