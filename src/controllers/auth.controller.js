const catchAsync = require("../utils/catchAsync");
const AuthService = require("../services/auth.service");
exports.signup = catchAsync(async (req, res, next) => {
  const { email, full_name, userId } = req.body;

  await AuthService.signup(email, full_name, userId);
  res.status(201).json({
    success: true,
  });
});
