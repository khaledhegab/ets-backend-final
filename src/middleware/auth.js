const { supabaseAdmin } = require("../config/supabase");
const ErrorHandler = require("../utils/errorHandler");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ErrorHandler("Access denied. No token provided.", 401));
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new ErrorHandler("Invalid token.", 401));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return next(new ErrorHandler("Invalid token.", 401));
  }
};

module.exports = auth;
