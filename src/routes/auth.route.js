const express = require("express");
const { body, validationResult } = require("express-validator");
const { supabaseAdmin } = require("../config/supabase");
const AuthController = require("../controllers/auth.controller");

const router = express.Router();

const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").exists().withMessage("Password is required"),
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

router.post("/signup", handleValidationErrors, AuthController.signup);

router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }

      res.json({
        success: true,
        message: "Login successful",
        user: data.user,
        session: data.session,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Server error during login",
      });
    }
  }
);

module.exports = router;
