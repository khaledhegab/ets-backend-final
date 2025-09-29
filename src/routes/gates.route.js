const express = require("express");
const { body, validationResult } = require("express-validator");
const GatesController = require("../controllers/gates.controller");
const stationAuth = require("../middleware/stationAuth");

const router = express.Router();

// Validation middleware for starting trip at gate
const validateStartTripAtGate = [
  body("access_key")
    .isString()
    .isLength({ min: 10 })
    .withMessage("Valid access key is required"),
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

// Validation middleware for ending trip at gate
const validateEndTripAtGate = [
  body("trip_id")
    .isString()
    .notEmpty()
    .withMessage("Valid trip ID is required"),
];

router.post(
  "/start-trip",
  stationAuth,
  validateStartTripAtGate,
  handleValidationErrors,
  GatesController.startTripAtGate
);

router.post(
  "/end-trip",
  stationAuth,
  validateEndTripAtGate,
  handleValidationErrors,
  GatesController.endTripAtGate
);

module.exports = router;
