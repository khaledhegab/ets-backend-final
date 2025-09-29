const { supabaseAdmin } = require("../config/supabase");
const ErrorHandler = require("../utils/errorHandler");

const stationAuth = async (req, res, next) => {
  try {
    const stationToken = req.headers["x-station-token"];
    const gateId = req.headers["x-gate-id"];

    // Check for required headers
    if (!gateId) {
      return next(new ErrorHandler("Gate ID header is required", 401));
    }

    // Verify gate exists and belongs to the station
    const { data: gate, error: gateError } = await supabaseAdmin
      .from("gates")
      .select("id, station_id, gate_number, is_operational, type")
      .eq("id", gateId)
      .eq("is_operational", true)
      .single();

    if (gateError || !gate) {
      return next(new ErrorHandler("Gate not found or inactive", 401));
    }
    if (stationToken !== process.env.STATION_AUTH_TOKEN) {
      return next(new ErrorHandler("Invalid station token", 401));
    }

    const { data: station, error: stationError } = await supabaseAdmin
      .from("stations")
      .select("id, name_en, name_ar")
      .eq("id", gate.station_id)
      .single();

    if (stationError || !station) {
      return next(new ErrorHandler("Station not found", 401));
    }
    // Add station and gate info to request for use in controllers

    req.station = {
      id: station.id,
      name_en: station.name_en,
      name_ar: station.name_ar,
    };

    req.gate = {
      id: gate.id,
      station_id: gate.station_id,
      gate_number: gate.gate_number,
      type: gate.type,
    };

    next();
  } catch (error) {
    return next(new ErrorHandler("Station authentication failed", 500));
  }
};

module.exports = stationAuth;
