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
import dotenv from "dotenv";

dotenv.config();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
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
  console.log("🚀 ~ createBookingPayment ~ req:", req?.user);
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
    amount: Math.round(booking.priceDetails.totalAmount * 100), // amount in smallest currency unit (paise) - must be integer
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
    amount: Math.round(additionalAmount * 100), // in paise (₹ → paise) - must be integer
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
        amount: Math.round(order.priceDetails.totalAmount * 100),
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
        amount: Math.round(order.priceDetails.totalAmount * 100),
        currency: "INR",
        receipt: `order_${order._id}`,
        orderId: order._id,
      },
    });
  }

  // Create Razorpay order
  const options = {
    amount: Math.round(order.priceDetails.totalAmount * 100), // amount in smallest currency unit (paise) - must be integer
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
    .populate("bike")
    .populate("bikeItems.bike"); // This will populate bike details for multiple bikes

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

  // Process bike data for template
  let bikeDetailsHtml = "";
  let totalBikes = 1;
  let bikeTypes = 1;

  if (booking.bikeItems && booking.bikeItems.length > 0) {
    // Multiple bikes
    totalBikes = booking.bikeItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    bikeTypes = booking.bikeItems.length;

    bikeDetailsHtml = booking.bikeItems
      .map((item) => {
        const bike = item.bike || {};
        const kmType =
          item.kmOption === "unlimited"
            ? "Unlimited KM"
            : `Limited KM (${item.kmLimit || 60} km/day)`;

        return `
        <div class="bike-card" style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
          <div class="bike-title" style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${
            bike.title || "Bike"
          }</div>
          <div class="bike-details" style="font-size: 16px; color: #64748b;">
            ${bike.brand || ""} ${bike.model || ""} ${
          bike.year ? `| ${bike.year}` : ""
        }
          </div>
          <div style="margin-top: 8px;">
            <span style="background: #f47b20; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">
              ${item.quantity} Bike${item.quantity > 1 ? "s" : ""}
            </span>
            <span style="background: #e2e8f0; color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${kmType}
            </span>
          </div>
          ${
            bike.registrationNumber
              ? `<div style="margin-top: 8px; font-size: 14px; color: #64748b;">Registration: ${bike.registrationNumber}</div>`
              : ""
          }
        </div>
      `;
      })
      .join("");

    bikeDetailsHtml += `
      <div style="text-align: center; margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; font-weight: 600; border: 2px solid #f47b20;">
        Total: ${totalBikes} Bike${
      totalBikes > 1 ? "s" : ""
    } | ${bikeTypes} Type${bikeTypes > 1 ? "s" : ""}
      </div>
    `;
  } else {
    // Single bike
    const packageType = bikeDetails.isUnlimited
      ? "Unlimited KM Package"
      : `Limited KM Package (${bikeDetails.kmLimit || 60} km/day)`;
    bikeDetailsHtml = `
      <div class="bike-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
        <div class="bike-title" style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${
          bikeInfo.title || "Bike"
        }</div>
        <div class="bike-details" style="font-size: 16px; color: #64748b;">
          ${bikeInfo.brand || ""} ${bikeInfo.model || ""} ${
      bikeInfo.year ? `| ${bikeInfo.year}` : ""
    }
        </div>
        <div style="margin-top: 8px;">
          <span style="background: #e2e8f0; color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${packageType}
          </span>
        </div>
        ${
          bikeInfo.registrationNumber
            ? `<div style="margin-top: 8px; font-size: 14px; color: #64748b;">Registration: ${bikeInfo.registrationNumber}</div>`
            : ""
        }
      </div>
    `;
  }

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

    // Bike Information - processed HTML
    bikeDetailsHtml: bikeDetailsHtml,
    totalBikes: totalBikes.toString(),
    bikeTypes: bikeTypes.toString(),

    // Single Bike Information (fallback for legacy bookings)
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
    baseAmount: price.basePrice || "0",
    taxAmount: price.taxes || "0",
    gstAmount: price.taxes || "0", // Using taxes as GST
    discountAmount: price.discount || "",
    additionalCharges: bikeDetails.additionalCharges?.amount || "",
    helmetCharges: price.helmetCharges || "0",
    securityDeposit: "", // Not in your structure, keeping empty
    totalAmount: price.totalAmount || "0",

    // Conditional pricing rows HTML
    helmetChargesRow:
      price.helmetCharges && price.helmetCharges !== "0"
        ? `
      <tr class="row">
        <td class="label">Helmet Rental</td>
        <td class="value">₹${price.helmetCharges}</td>
      </tr>
    `
        : "",
    discountRow:
      price.discount && price.discount !== "0"
        ? `
      <tr class="row">
        <td class="label">Discount Applied</td>
        <td class="value" style="color: #16a34a">-₹${price.discount}</td>
      </tr>
    `
        : "",
    securityDepositRow: "", // Always empty for now

    // Package Information (for single bike)
    packageType: bikeDetails.isUnlimited
      ? "Unlimited KM"
      : `Limited KM (${bikeDetails.kmLimit || 60} km/day)`,

    // URLs
    bookingUrl: `${
      process.env.FRONTEND_URL || "https://happygobikes.netlify.app"
    }/booking/confirmed/${booking._id}`,
    websiteUrl: process.env.FRONTEND_URL || "https://happygobikes.netlify.app",
    bookingsUrl: `${
      process.env.FRONTEND_URL || "https://happygobikes.netlify.app"
    }/bookings`,
    supportUrl: `${
      process.env.FRONTEND_URL || "https://happygobikes.netlify.app"
    }/support`,
    termsUrl: `${
      process.env.FRONTEND_URL || "https://happygobikes.netlify.app"
    }/terms`,
    privacyUrl: `${
      process.env.FRONTEND_URL || "https://happygobikes.netlify.app"
    }/privacy`,
    trackingUrl: `${
      process.env.FRONTEND_URL || "https://happygobikes.netlify.app"
    }/bookings`,
  };

  console.log("🚀 ~ Email Variables:", variables);

  try {
    // Path to booking confirmation template
    const bookingTemplatePath = path.join(
      __dirname,
      "../templates/booking-confirmation-email.html"
    );

    // Check if template file exists
    if (!fs.existsSync(bookingTemplatePath)) {
      console.error("Booking template not found at:", bookingTemplatePath);
      throw new ApiError("Booking email template not found", 500);
    }

    // Fill template
    const bookingEmailHtml = fillTemplate(bookingTemplatePath, variables);

    // Send Booking Confirmation Email only
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
    message: "Payment verified and booking confirmation email sent",
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
