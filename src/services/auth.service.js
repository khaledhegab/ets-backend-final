const { supabaseAdmin } = require("../config/supabase");
const ErrorHandler = require("../utils/errorHandler");

class AuthService {
  async signup(email, full_name, id) {
    const { error } = await supabaseAdmin
      .schema("public")
      .from("users")
      .insert({
        id,
        email,
        full_name,
      });
    if (error) {
      throw new ErrorHandler(error.message, 400);
    }
  }
}

module.exports = new AuthService();
