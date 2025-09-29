const crypto = require("crypto");
const { supabaseAdmin } = require("../config/supabase");
const ErrorHandler = require("../utils/errorHandler");
const metroRoutes = require("../utils/metroRoutes");

class GatesService {
  async startTripAtGate(accessKey, stationId, gateId) {
    // Validate and decrypt access key
    const keyPayload = this.validateAccessKey(accessKey);

    if (!keyPayload) {
      throw new ErrorHandler("Invalid or expired access key", 401);
    }

    const userId = keyPayload.userId;
    const numberOfClients = keyPayload.numberOfClients;

    // Get user's current balance
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("available_balance, holding_balance")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Get extended distance price to calculate total cost
    const { data: ticketType, error: ticketError } = await supabaseAdmin
      .from("ticket_type")
      .select("id, price")
      .eq("type_name", "Extended Distance")
      .single();

    if (ticketError || !ticketType) {
      throw new ErrorHandler("Extended Distance ticket type not found", 404);
    }

    const totalCost = numberOfClients * ticketType.price;

    // Check if user has sufficient available balance
    if (user.available_balance < totalCost) {
      throw new ErrorHandler(
        `Insufficient balance. Required: ${totalCost}, Available: ${user.available_balance}`,
        400
      );
    }

    // Check if user already has an active trip
    const { data: activeTrip } = await supabaseAdmin
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .eq("is_ended", false)
      .single();

    if (activeTrip) {
      throw new ErrorHandler("User already has an active trip", 409);
    }

    // Create hold transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        is_debit: true, // Debit transaction (money held)
        amount: totalCost,
        is_hold: true,
      })
      .select()
      .single();

    if (transactionError) {
      throw new ErrorHandler("Failed to create transaction record", 500);
    }

    // Update user's balance (move from available to holding)
    const newAvailableBalance = user.available_balance - totalCost;
    const newHoldingBalance = user.holding_balance + totalCost;

    const { error: balanceUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        available_balance: newAvailableBalance,
        holding_balance: newHoldingBalance,
      })
      .eq("id", userId);

    if (balanceUpdateError) {
      // Rollback transaction if balance update fails
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      throw new ErrorHandler("Failed to update user balance", 500);
    }

    // Create trip record
    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .insert({
        user_id: userId,
        start_station_id: stationId,
        start_gate_id: gateId,
        start_at: new Date().toISOString(),
        transaction_id: transaction.id,
        is_ended: false,
        number_of_clients: numberOfClients,
      })
      .select()
      .single();

    if (tripError) {
      // Rollback balance update and transaction
      await supabaseAdmin
        .from("users")
        .update({
          available_balance: user.available_balance,
          holding_balance: user.holding_balance,
        })
        .eq("id", userId);

      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      throw new ErrorHandler("Failed to create trip record", 500);
    }

    return {
      tripId: trip.id,
      userId: userId,
      transactionId: transaction.id,
      amountHeld: totalCost,
      remainingBalance: newAvailableBalance,
      startStationId: stationId,
      startGateId: gateId,
      startedAt: trip.start_at,
      numberOfClients: numberOfClients,
    };
  }

  async endTripAtGate(tripId, stationId, gateId, stationInfo, gateInfo) {
    // Get trip details and validate it exists and is not ended
    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .select(
        `
        id, 
        user_id, 
        start_station_id, 
        start_gate_id, 
        start_at, 
        transaction_id, 
        is_ended,
        end_at,
        end_station_id,
        end_gate_id,
        number_of_clients
      `
      )
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      throw new ErrorHandler("Trip not found", 404);
    }

    if (trip.is_ended) {
      throw new ErrorHandler("Trip is already ended", 400);
    }

    // Calculate number of stations between start and end
    const stationCount = metroRoutes.calculateStationCount(
      trip.start_station_id,
      stationId
    );

    // Get the appropriate ticket type based on station count
    const ticketTypeName =
      metroRoutes.getTicketTypeByStationCount(stationCount);

    const { data: ticketType, error: ticketTypeError } = await supabaseAdmin
      .from("ticket_type")
      .select("id, price")
      .eq("type_name", ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      throw new ErrorHandler(`Ticket type '${ticketTypeName}' not found`, 404);
    }

    // Get the original transaction to know the held amount
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, amount, is_hold")
      .eq("id", trip.transaction_id)
      .single();

    if (transactionError || !transaction) {
      throw new ErrorHandler("Original transaction not found", 404);
    }

    if (!transaction.is_hold) {
      throw new ErrorHandler("Transaction is not in hold status", 400);
    }

    // Get user's current balance
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("available_balance, holding_balance")
      .eq("id", trip.user_id)
      .single();

    if (userError || !user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Calculate the actual fare based on distance traveled
    // Note: We need to get number of clients from somewhere - let's assume it's stored in the trip or calculate from held amount
    const heldAmount = transaction.amount;
    const actualFare = trip.number_of_clients * ticketType.price;

    // Calculate refund amount (if any)
    const refundAmount = heldAmount - actualFare;

    // Update the trip record to mark it as ended
    const { error: tripUpdateError } = await supabaseAdmin
      .from("trips")
      .update({
        end_station_id: stationId,
        end_gate_id: gateId,
        end_at: new Date().toISOString(),
        is_ended: true,
        ticket_type_id: ticketType.id,
        number_of_stations: stationCount,
      })
      .eq("id", tripId);

    if (tripUpdateError) {
      throw new ErrorHandler("Failed to update trip record", 500);
    }

    // Update the transaction to remove hold status
    const { error: transactionUpdateError } = await supabaseAdmin
      .from("transactions")
      .update({
        is_hold: false,
        amount: actualFare, // Update to actual fare
        created_at: new Date().toISOString(),
      })
      .eq("id", trip.transaction_id);

    if (transactionUpdateError) {
      throw new ErrorHandler("Failed to update transaction record", 500);
    }

    // Update user's balance
    // Remove the held amount from holding balance and add actual fare as deduction
    // Add any refund to available balance
    const newHoldingBalance = user.holding_balance - heldAmount;
    const newAvailableBalance = user.available_balance + refundAmount;

    const { error: balanceUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        available_balance: newAvailableBalance,
        holding_balance: newHoldingBalance,
      })
      .eq("id", trip.user_id);

    if (balanceUpdateError) {
      throw new ErrorHandler("Failed to update user balance", 500);
    }

    return {
      tripId: trip.id,
      userId: trip.user_id,
      startStationId: trip.start_station_id,
      endStationId: stationId,
      startGateId: trip.start_gate_id,
      endGateId: gateId,
      startedAt: trip.start_at,
      endedAt: new Date().toISOString(),
    };
  }

  validateAccessKey(accessKey) {
    try {
      const algorithm = "aes-256-cbc";
      const secretKey =
        process.env.TRIP_KEY_SECRET ||
        "default-secret-key-change-in-production";
      const key = crypto.scryptSync(secretKey, "salt", 32);

      const [ivHex, encryptedData] = accessKey.split(":");
      const iv = Buffer.from(ivHex, "hex");

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      const payload = JSON.parse(decrypted);

      // Check if key is expired
      if (Date.now() > payload.expiresAt) {
        return null; // Expired key
      }

      return payload;
    } catch (error) {
      console.error("Access key validation error:", error);
      return null; // Invalid key
    }
  }
}

module.exports = new GatesService();
