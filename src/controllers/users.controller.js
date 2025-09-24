const catchAsync = require("../utils/catchAsync");
const UsersService = require("../services/users.service");

exports.startTrip = catchAsync(async (req, res, next) => {
  const { number_of_clients } = req.body;
  const userId = req.user.id;

  const data = await UsersService.startTrip(userId, number_of_clients);

  res.status(200).json({
    success: true,
    message: "Trip key generated successfully",
    data: {
      access_key: data.accessKey,
      expires_at: data.expiresAt,
      total_cost: data.totalCost,
    },
  });
});

exports.rechargeBalance = catchAsync(async (req, res, next) => {
  const signature = req.headers["myfatoorah-signature"];
  const webhookData = req.body;
  res.status(200).json({
    success: true,
  });
  await UsersService.rechargeBalance(webhookData, signature);
});

exports.findRoute = catchAsync(async (req, res, next) => {
  const { start_lat, start_long, arrival_lat, arrival_long } = req.body;

  const data = await UsersService.findNearestStations(
    start_lat,
    start_long,
    arrival_lat,
    arrival_long
  );
  console.log(data);
  res.status(200).json({
    success: true,
    message: "Nearest stations found successfully",
    data,
  });
});
