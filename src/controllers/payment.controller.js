import Booking from "../models/booking.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSMS } from "../utils/sendSMS.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_B2oNl52RAg8PRk",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "s1ley2lszg0KQXBaYizEV3bp",
});

// function fillTemplate(templatePath, variables) {
//   let template = fs.readFileSync(templatePath, "utf-8");
//   for (const [key, value] of Object.entries(variables)) {
//     const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
//     template = template.replace(regex, value ?? "");
//   }
//   return template;
// }

// Helper to load and fill HTML template
function fillTemplate(templatePath, vars) {
  let html = fs.readFileSync(templatePath, "utf-8");

  /* 1️⃣ conditional blocks {{#if var}} ... {{/if}} */
  html = html.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, section) =>
      vars[key] !== undefined && vars[key] !== "" && vars[key] !== "0"
        ? section
        : ""
  );

  /* 2️⃣ simple {{ var }} tokens */
  for (const [key, value] of Object.entries(vars)) {
    const token = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"); // {{ key }}
    html = html.replace(token, value ?? "");
  }

  /* 3️⃣ strip anything we forgot so the mail doesn’t show {{something}} */
  html = html.replace(/\{\{\s*\w+\s*\}\}/g, "");

  return html;
}

// Helper to calculate total days between dates
function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}

// Helper to format date
function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Helper to format time
function formatTime(time) {
  if (!time) return "";
  // If time is in HH:MM format, return as is
  if (typeof time === "string" && time.includes(":")) {
    return time;
  }
  // If it's a date object, extract time
  return new Date(time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
// @desc    Create payment order for booking
// @route   POST /api/payments/booking/:id
// @access  Private
export const createBookingPayment = asyncHandler(async (req, res) => {
  // Get booking
  const booking = await Booking.findById(req.params.id);
  // console.log("🚀 ~ createBookingPayment ~ booking:", booking);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking belongs to user
  if (booking?.user?.toString() !== req.user?._id.toString()) {
    throw new ApiError("Not authorized to access this booking", 401);
  }

  // Check if payment is already completed
  if (booking.paymentStatus === "completed") {
    throw new ApiError("Payment already completed for this booking", 400);
  }

  // Create Razorpay order
  const options = {
    amount: booking.priceDetails.totalAmount * 100, // amount in smallest currency unit (paise)
    currency: "INR",
    receipt: `booking_${booking._id}`,
    payment_capture: 1, // auto capture
  };

  console.log("payments about to end");

  const order = await razorpay.orders.create(options);

  res.status(200).json({
    success: true,
    data: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      bookingId: booking._id,
    },
  });
});

export const createExtendBookingPayment = asyncHandler(async (req, res) => {
  // 1. Fetch the booking from DB
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // 2. Ensure the booking belongs to the logged‐in user
  if (booking.user.toString() !== req.user._id.toString()) {
    throw new ApiError("Not authorized to access this booking", 401);
  }

  // 3. Check if there is at least one extension entry in extensionHistory
  if (!booking.extensionHistory || booking.extensionHistory.length === 0) {
    throw new ApiError("No extension found for this booking", 400);
  }

  // 4. Grab the **latest** extension record
  const lastExtension =
    booking.extensionHistory[booking.extensionHistory.length - 1];

  // 5. If the additionalAmount from the last extension is zero (or missing), nothing to pay
  const additionalAmount = Number(lastExtension.additionalAmount || 0);
  if (additionalAmount <= 0) {
    throw new ApiError(
      "No additional payment is required for this extension",
      400
    );
  }

  // 6. Create a Razorpay order for exactly that extra amount
  const razorpayOptions = {
    amount: additionalAmount * 100, // in paise (₹ → paise)
    currency: "INR",
    receipt: `extension_${booking._id}_${Date.now()}`, // e.g. extension_60f0b0a1d48abc1234567890_1627672800000
    payment_capture: 1, // auto capture
  };

  // If you have a Razorpay instance, you’d do:
  // const order = await razorpay.orders.create(razorpayOptions);
  //
  // For demonstration, we’ll return a placeholder:
  //    id: order.id
  //    amount: order.amount
  //    currency: order.currency
  //    receipt: order.receipt

  // 7. Return the Order payload
  res.status(200).json({
    success: true,
    data: {
      id: "order.id", // <-- replace with `order.id` from Razorpay
      amount: "order.amount", // <-- replace with `order.amount`
      currency: "order.currency", // <-- replace with `order.currency`
      receipt: "order.receipt", // <-- replace with `order.receipt`
      bookingId: booking._id,
      extensionId: lastExtension._id, // if you need to track which extension was paid
      amountToPay: additionalAmount, // (in ₹)
    },
  });
});
// @desc    Create payment order for product order
// @route   POST /api/payments/order/:id
// @access  Private
export const createOrderPayment = asyncHandler(async (req, res) => {
  // Get order
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Check if order belongs to user
  if (order.user.toString() !== req.user._id.toString()) {
    throw new ApiError("Not authorized to access this order", 401);
  }

  // Check if payment is already completed
  if (order.paymentStatus === "completed") {
    throw new ApiError("Payment already completed for this order", 400);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Dev mode: skipping Razorpay, auto‑completing payment");
    // mock‑complete:
    const mockId = "mock_payment_" + Date.now();
    order.paymentStatus = "completed";
    order.paymentId = mockId;
    order.orderStatus = "processing";
    await order.save();
    return res.status(200).json({
      success: true,
      message: "Development mode: Payment automatically marked as completed",
      data: {
        id: "mock_order_" + Date.now(),
        amount: order.priceDetails.totalAmount * 100,
        currency: "INR",
        receipt: `order_${order._id}`,
        orderId: order._id,
      },
    });
  }

  // DEVELOPMENT MODE: Skip actual Razorpay integration
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET ||
    !razorpay
  ) {
    console.log("Razorpay not configured. Using mock payment order.");

    // Auto-complete the payment for development
    order.paymentStatus = "completed";
    order.paymentId = "mock_payment_" + Date.now();
    order.orderStatus = "processing";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Development mode: Payment automatically marked as completed",
      data: {
        id: "mock_order_" + Date.now(),
        amount: order.priceDetails.totalAmount * 100,
        currency: "INR",
        receipt: `order_${order._id}`,
        orderId: order._id,
      },
    });
  }

  // Create Razorpay order
  const options = {
    amount: order.priceDetails.totalAmount * 100, // amount in smallest currency unit (paise)
    currency: "INR",
    receipt: `order_${order._id}`,
    payment_capture: 1, // auto capture
  };

  const razorpayOrder = await razorpay.orders.create(options);

  res.status(200).json({
    success: true,
    data: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      orderId: order._id,
    },
  });
});

// @desc    Verify payment for booking
// @route   POST /api/payments/booking/:id/verify
// @access  Private
export const verifyBookingPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError("Invalid payment signature", 400);
  }

  // Get booking with bike details populated
  const booking = await Booking.findById(req.params.id)
    .populate("user")
    .populate("bike"); // This will populate the actual bike details

  if (!booking) throw new ApiError("Booking not found", 404);

  // Update booking payment status
  booking.paymentStatus = "completed";
  booking.paymentId = razorpay_payment_id;
  booking.bookingStatus = "confirmed";
  await booking.save();

  // Prepare variables for template
  const user = booking.user;
  const price = booking.priceDetails || {};
  const bikeDetails = booking.bikeDetails || {};
  const bikeInfo = booking.bike || {}; // This is the populated bike document

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Calculate total days
  const totalDays = calculateDays(booking.startDate, booking.endDate);

  const variables = {
    // Customer Information
    customerName: user.name || "",
    customerEmail: user.email || "",
    customerMobile: user.mobile || "",

    // Booking Information
    bookingId: booking._id.toString(),
    paymentId: razorpay_payment_id,
    paymentDate: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),

    // Bike Information (from populated bike document)
    bikeTitle: bikeInfo.title || bikeInfo.name || "Bike",
    bikeBrand: bikeInfo.brand || "",
    bikeModel: bikeInfo.model || "",
    bikeYear: bikeInfo.year || "",
    bikeRegistration: bikeInfo.registrationNumber || bikeInfo.regNumber || "",

    // Rental Period
    pickupDate: formatDate(booking.startDate),
    pickupTime: formatTime(booking.startTime),
    dropoffDate: formatDate(booking.endDate),
    dropoffTime: formatTime(booking.endTime),
    totalDays: totalDays.toString(),

    // Price Details (mapping to your actual structure)
    baseAmount: price.basePrice || "",
    taxAmount: price.taxes || "",
    gstAmount: price.taxes || "", // Using taxes as GST
    discountAmount: price.discount || "",
    additionalCharges: bikeDetails.additionalCharges?.amount || "",
    helmetCharges: "", // Not in your structure, keeping empty
    securityDeposit: "", // Not in your structure, keeping empty
    totalAmount: price.totalAmount || "",

    // Package Information
    packageType: bikeDetails.isUnlimited
      ? "Unlimited"
      : `${bikeDetails.kmLimit} KM`,

    // URLs
    bookingUrl: `${
      process.env.FRONTEND_URL || "https://happygorentals.com"
    }/bookings/${booking._id}`,
    websiteUrl: process.env.FRONTEND_URL || "https://happygorentals.com",
    bookingsUrl: `${
      process.env.FRONTEND_URL || "https://happygorentals.com"
    }/my-bookings`,
    supportUrl: `${
      process.env.FRONTEND_URL || "https://happygorentals.com"
    }/support`,
    termsUrl: `${
      process.env.FRONTEND_URL || "https://happygorentals.com"
    }/terms`,
    privacyUrl: `${
      process.env.FRONTEND_URL || "https://happygorentals.com"
    }/privacy`,
    trackingUrl: `${
      process.env.FRONTEND_URL || "https://happygorentals.com"
    }/my-bookings/${booking._id}`,
  };

  console.log("🚀 ~ Email Variables:", variables);

  try {
    // Paths to your HTML templates
    const paymentTemplatePath = path.join(
      __dirname,
      "../templates/payment-confirmation-email.html"
    );
    const bookingTemplatePath = path.join(
      __dirname,
      "../templates/booking-confirmation-email.html"
    );

    // Check if template files exist
    if (!fs.existsSync(paymentTemplatePath)) {
      console.error("Payment template not found at:", paymentTemplatePath);
      throw new ApiError("Payment email template not found", 500);
    }

    if (!fs.existsSync(bookingTemplatePath)) {
      console.error("Booking template not found at:", bookingTemplatePath);
      throw new ApiError("Booking email template not found", 500);
    }

    // Fill templates
    const paymentEmailHtml = fillTemplate(paymentTemplatePath, variables);
    const bookingEmailHtml = fillTemplate(bookingTemplatePath, variables);

    // Send Payment Confirmation Email
    await sendEmail({
      email: user.email,
      subject: "✅ Payment Confirmed - Happy Go Bike Rentals",
      message: paymentEmailHtml,
      isHtml: true,
    });

    console.log("✅ Payment confirmation email sent to:", user.email);

    // Send Booking Confirmation Email
    await sendEmail({
      email: user.email,
      subject: "🎉 Booking Confirmed - Happy Go Bike Rentals",
      message: bookingEmailHtml,
      isHtml: true,
    });

    console.log("✅ Booking confirmation email sent to:", user.email);
  } catch (emailError) {
    console.error("❌ Email sending failed:", emailError);
    // Don't throw error here, payment is already processed
    // Just log the error and continue
  }

  res.status(200).json({
    success: true,
    message: "Payment verified and confirmation emails sent",
    data: booking,
  });
});

// @desc    Verify payment for order
// @route   POST /api/payments/order/:id/verify
// @access  Private
export const verifyOrderPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError("Invalid payment signature", 400);
  }

  // Get order
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Update order payment status
  order.paymentStatus = "completed";
  order.paymentId = razorpay_payment_id;
  order.orderStatus = "processing";
  await order.save();

  // Send confirmation email
  const user = await User.findById(order.user);

  const emailMessage = `
    <h1>Payment Confirmation</h1>
    <p>Dear ${user.name},</p>
    <p>Your payment for order has been confirmed.</p>
    <p>Order ID: ${order._id}</p>
    <p>Payment ID: ${razorpay_payment_id}</p>
    <p>Amount: ₹${order.priceDetails.totalAmount}</p>
    <p>Thank you for shopping with HappyGo!</p>
  `;

  await sendEmail({
    email: user.email,
    subject: "HappyGo Order Payment Confirmation",
    message: emailMessage,
  });

  // Send confirmation SMS
  const smsMessage = `Your payment for HappyGo order is confirmed. Order ID: ${order._id}. Payment ID: ${razorpay_payment_id}. Thank you!`;

  await sendSMS({
    phone: user.mobile,
    message: smsMessage,
  });

  res.status(200).json({
    success: true,
    message: "Payment verified successfully",
    data: order,
  });
});
