const crypto = require("crypto");
const { supabaseAdmin } = require("../config/supabase");
const ErrorHandler = require("../utils/errorHandler");
const MetroRoutes = require("../utils/metroRoutes");

class UsersService {
  async startTrip(userId, numberOfClients) {
    // Get user's current balance
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("available_balance")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Get extended distance price from ticket_type table
    const { data: ticketType, error: ticketError } = await supabaseAdmin
      .from("ticket_type")
      .select("price")
      .eq("type_name", "Extended Distance")
      .single();

    if (ticketError || !ticketType) {
      throw new ErrorHandler("Extended Distance ticket type not found", 404);
    }

    const extendedPrice = ticketType.price;
    const totalCost = numberOfClients * extendedPrice;

    // Check if user has sufficient balance
    if (user.available_balance < totalCost) {
      throw new ErrorHandler(
        `Insufficient balance. Required: ${totalCost}, Available: ${user.available_balance}`,
        400
      );
    }

    const { data: activeTrip } = await supabaseAdmin
      .from("trips")
      .select("id")
      .eq("user_id", userId)
      .eq("is_ended", false)
      .single();

    if (activeTrip) {
      throw new ErrorHandler("User already has an active trip", 409);
    }

    // Generate encrypted access key
    const accessKey = this.generateAccessKey(userId, numberOfClients);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    return {
      accessKey,
      expiresAt,
      totalCost,
    };
  }

  async rechargeBalance(webhookData, signature) {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(webhookData, signature)) {
      return;
    }

    const { Event, Data } = webhookData;

    // Only process PAYMENT_STATUS_CHANGED events
    if (Event.Code !== 1 || Event.Name !== "PAYMENT_STATUS_CHANGED") {
      return;
    }

    // Only process successful payments
    if (
      Data.Transaction.Status !== "SUCCESS" ||
      Data.Invoice.Status !== "PAID"
    ) {
      return;
    }

    const userId = Data.Invoice.ExternalIdentifier; // user ID
    const amount = parseFloat(Data.Amount.ValueInBaseCurrency);
    const invoiceId = Data.Invoice.Id;
    const transactionId = Data.Transaction.Id;
    const paymentId = Data.Transaction.PaymentId;

    // Check if this transaction has already been processed
    const { data: existingTransaction } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("reference_id", paymentId)
      .single();

    if (existingTransaction) {
      return;
    }

    // Get user's current balance
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("available_balance")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return;
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        is_debit: false, // Credit transaction
        payment_method: Data.Transaction.PaymentMethod,
        amount: amount,
        reference_id: paymentId,
        is_hold: false,
      })
      .select()
      .single();

    if (transactionError) {
      //   throw new ErrorHandler("Failed to create transaction record", 500);
      return;
    }

    // Update user's balance
    const newBalance = user.available_balance + amount;
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ available_balance: newBalance })
      .eq("id", userId);
  }

  verifyWebhookSignature(webhookData, receivedSignature) {
    if (!receivedSignature) {
      return false;
    }

    const secretKey = process.env.MYFATOORAH_WEBHOOK_SECRET;
    if (!secretKey) {
      throw new ErrorHandler("MyFatoorah webhook secret not configured", 500);
    }

    try {
      const { Data } = webhookData;
      const invoiceId = Data.Invoice.Id || "";
      const invoiceStatus = Data.Invoice.Status || "";
      const transactionStatus = Data.Transaction.Status || "";
      const paymentId = Data.Transaction.PaymentId || "";
      const externalIdentifier = Data.Invoice.ExternalIdentifier || "";

      const signatureString = `Invoice.Id=${invoiceId},Invoice.Status=${invoiceStatus},Transaction.Status=${transactionStatus},Transaction.PaymentId=${paymentId},Invoice.ExternalIdentifier=${externalIdentifier}`;

      const hmac = crypto.createHmac("sha256", secretKey);
      hmac.update(signatureString, "utf8");
      const calculatedSignature = hmac.digest("base64");

      return calculatedSignature === receivedSignature;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  generateAccessKey(userId, numberOfClients) {
    // Create a payload with user ID, client count, and expiry
    const payload = {
      userId,
      numberOfClients,
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    // Convert payload to string and encrypt
    const algorithm = "aes-256-cbc";
    const secretKey =
      process.env.TRIP_KEY_SECRET || "default-secret-key-change-in-production";
    const key = crypto.scryptSync(secretKey, "salt", 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
    encrypted += cipher.final("hex");

    // Combine IV and encrypted data
    const accessKey = iv.toString("hex") + ":" + encrypted;

    return accessKey;
  }

  async findNearestStations(startLat, startLong, arrivalLat, arrivalLong) {
    // Get all stations from database
    const { data: stations, error } = await supabaseAdmin
      .from("stations")
      .select("id, name_en, name_ar, latitude, longitude, line_number");

    if (error) {
      throw new ErrorHandler("Failed to fetch stations", 500);
    }

    if (!stations || stations.length === 0) {
      throw new ErrorHandler("No stations found", 404);
    }

    // Filter out stations without coordinates
    const validStations = stations.filter(
      (station) => station.latitude && station.longitude
    );

    if (validStations.length === 0) {
      throw new ErrorHandler("No stations with valid coordinates found", 404);
    }

    // Calculate distances and find nearest stations
    const departureStations = validStations.map((station) => ({
      ...station,
      distance: this.calculateDistance(
        startLat,
        startLong,
        station.latitude,
        station.longitude
      ),
      type: "departure",
    }));

    const destinationStations = validStations.map((station) => ({
      ...station,
      distance: this.calculateDistance(
        arrivalLat,
        arrivalLong,
        station.latitude,
        station.longitude
      ),
      type: "destination",
    }));

    // Sort by distance and get the nearest ones
    const nearestDeparture = departureStations.sort(
      (a, b) => a.distance - b.distance
    )[0];

    const nearestDestination = destinationStations.sort(
      (a, b) => a.distance - b.distance
    )[0];

    // Get route information between the stations
    let routeInfo = null;
    try {
      if (nearestDeparture.id !== nearestDestination.id) {
        const tripInfo = MetroRoutes.getTripInfo(
          nearestDeparture.id,
          nearestDestination.id
        );

        // Create a map of stations for quick lookup
        const stationMap = {};
        validStations.forEach((station) => {
          stationMap[station.id] = station;
        });

        routeInfo = {
          total_stations: tripInfo.stationCount,
          ticket_type: tripInfo.ticketType,
          lines_used: tripInfo.linesUsed,
          has_transfer: tripInfo.hasTransfer,
          transfer_stations: tripInfo.transferStations,
          route_path: tripInfo.route.map((step) => {
            const station = stationMap[step.station];
            return {
              station_id: step.station,
              name_en: station ? station.name_en : null,
              name_ar: station ? station.name_ar : null,
              line: step.line,
            };
          }),
        };
      } else {
        routeInfo = {
          total_stations: 0,
          ticket_type: "Same Station",
          lines_used: nearestDeparture.line_number,
          has_transfer: false,
          transfer_stations: [],
          route_path: [
            {
              station_id: nearestDeparture.id,
              name_en: nearestDeparture.name_en,
              name_ar: nearestDeparture.name_ar,
              line: null,
            },
          ],
        };
      }
    } catch (error) {
      // If route calculation fails, set basic info
      routeInfo = {
        total_stations: null,
        ticket_type: "Route calculation unavailable",
        lines_used: [],
        has_transfer: null,
        transfer_stations: [],
        route_path: [],
        error: "Unable to calculate route between stations, " + error.message,
      };
    }

    return {
      departure_station: {
        id: nearestDeparture.id,
        name_en: nearestDeparture.name_en,
        name_ar: nearestDeparture.name_ar,
        latitude: nearestDeparture.latitude,
        longitude: nearestDeparture.longitude,
        line_number: nearestDeparture.line_number,
        distance_km: Math.round(nearestDeparture.distance * 100) / 100,
      },
      destination_station: {
        id: nearestDestination.id,
        name_en: nearestDestination.name_en,
        name_ar: nearestDestination.name_ar,
        latitude: nearestDestination.latitude,
        longitude: nearestDestination.longitude,
        line_number: nearestDestination.line_number,
        distance_km: Math.round(nearestDestination.distance * 100) / 100,
      },
      route_info: routeInfo,
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}
module.exports = new UsersService();
