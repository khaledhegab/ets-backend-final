const catchAsync = require("../utils/catchAsync");
const GatesService = require("../services/gates.service");
const ErrorHandler = require("../utils/errorHandler");

exports.startTripAtGate = catchAsync(async (req, res, next) => {
  const { access_key } = req.body;
  const stationInfo = req.station; // From station auth middleware
  const gateInfo = req.gate; // From station auth middleware

  if (gateInfo.type !== "entry") {
    return next(new ErrorHandler("This gate is not an entry gate", 400));
  }

  const data = await GatesService.startTripAtGate(
    access_key,
    stationInfo.id,
    gateInfo.id,
    stationInfo,
    gateInfo
  );

  res.status(200).json({
    success: true,
    message: "Trip started successfully at gate",
    data: {
      trip_id: data.tripId,
      user_id: data.userId,
      transaction_id: data.transactionId,
      amount_held: data.amountHeld,
      remaining_available_balance: data.remainingBalance,
      start_station_id: data.startStationId,
      start_gate_id: data.startGateId,
      started_at: data.startedAt,
      gate_number: gateInfo.gate_number,
      station_name: stationInfo.name_en,
    },
  });
});

exports.endTripAtGate = catchAsync(async (req, res, next) => {
  const { trip_id } = req.body;
  const stationInfo = req.station; // From station auth middleware
  const gateInfo = req.gate; // From station auth middleware

  if (gateInfo.type !== "exit") {
    return next(new ErrorHandler("This gate is not an exit gate", 400));
  }
  const data = await GatesService.endTripAtGate(
    trip_id,
    stationInfo.id,
    gateInfo.id,
    stationInfo,
    gateInfo
  );

  res.status(200).json({
    success: true,
    message: "Trip ended successfully at gate",
    data: {
      trip_id: data.tripId,
      user_id: data.userId,
      start_station_id: data.startStationId,
      end_station_id: data.endStationId,
      start_gate_id: data.startGateId,
      end_gate_id: data.endGateId,
      started_at: data.startedAt,
      ended_at: data.endedAt,
    },
  });
});
