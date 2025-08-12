import axios from "axios";

/**
 * Send SMS via 2Factor AUTOGEN2 API.
 * 
 * Uses 2Factor's auto-generated OTP and returns the OTP for database storage.
 *
 * Usage examples:
 * - sendSMS({ phone: "9876543210" }) // Returns { otp: "459288", ... }
 */
export const sendSMS = async (options) => {
  const { phone } = options || {};

  if (!phone) {
    throw new Error("sendSMS: 'phone' is required");
  }

  // 2Factor credentials
  const apiKey = process.env.TWOFACTOR_API_KEY;
  if (!apiKey) {
    throw new Error("TWOFACTOR_API_KEY is not set in environment");
  }

  // Prepare mobile number for 2Factor (with country code)
  const sanitizeIndianMobile = (raw) => {
    const digits = (raw || "").replace(/\D/g, "");
    const lastTen = digits.slice(-10);
    return `91${lastTen}`;
  };
  const recipient = sanitizeIndianMobile(phone);

  try {
    console.log("Sending OTP via 2Factor AUTOGEN2...");
    console.log("Recipient:", recipient);
    console.log("API Key (first 10 chars):", apiKey?.substring(0, 10));
    
    // Call 2Factor AUTOGEN2 API
    const smsUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${recipient}/AUTOGEN2/`;
    console.log("SMS URL:", smsUrl);
    
    const response = await axios.get(smsUrl, { timeout: 15000 });
    console.log("2Factor Response:", response.data);
    
    const data = response.data;
    
    // Check if OTP was generated successfully
    if (data?.Status === "Success" && data?.OTP) {
      console.log("✅ OTP generated and sent successfully!");
      console.log("Generated OTP:", data.OTP);
      console.log("Session ID:", data.Details);
      
      return {
        success: true,
        message: "OTP generated and sent successfully via 2Factor",
        otp: data.OTP, // Return the OTP for database storage
        sessionId: data.Details,
        provider: "2factor",
        data: data,
      };
    }
    
    const reason = data?.Details || data?.Message || "Unknown error from 2Factor";
    throw new Error(`2Factor error: ${reason}`);
  } catch (error) {
    // Log detailed error for debugging
    console.log("2Factor Error Details:");
    console.log("Status:", error?.response?.status);
    console.log("Response Data:", error?.response?.data);
    console.log("Headers:", error?.response?.headers);
    
    // Normalize and rethrow for upstream error handler
    const errorData = error?.response?.data;
    const messageText = errorData?.Details || errorData?.message || error?.message || "Failed to send OTP via 2Factor";
    throw new Error(`sendSMS failed: ${messageText}`);
  }
};