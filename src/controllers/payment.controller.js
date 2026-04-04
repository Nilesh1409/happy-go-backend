import Booking from "../models/booking.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSMS } from "../utils/sendSMS.js";
import { generateBookingConfirmationEmail } from "../utils/emailTemplates.js";
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
// @desc    Create payment order for booking (supports partial and full payment)
// @route   POST /api/payments/booking/:id
// @access  Private
export const createBookingPayment = asyncHandler(async (req, res) => {
  const { paymentType = "full" } = req.body; // "partial" or "full"
  
  // Get booking
  const booking = await Booking.findById(req.params.id);
  console.log("🚀 ~ createBookingPayment ~ req:", req?.user);

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

  let paymentAmount;
  let paymentTypeForHistory;

  if (paymentType === "partial") {
    // Check if partial payment is already made
    if (booking.paymentStatus === "partial") {
      throw new ApiError("Partial payment already completed. Use remaining payment option.", 400);
    }

    // For COMBINED bookings, calculate partial from combined total
    if (booking.paymentGroupId) {
      // Get all bookings in this payment group
      const allBookings = await Booking.find({
        paymentGroupId: booking.paymentGroupId,
      }).select("priceDetails paymentDetails");

      // Calculate combined total
      const combinedTotal = allBookings.reduce(
        (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
        0
      );

      const partialPercentage = booking.paymentDetails?.partialPaymentPercentage || 25;
      paymentAmount = Math.round((combinedTotal * partialPercentage) / 100);
    } else {
      // Single booking - use individual amount
      const totalAmount = booking.paymentDetails?.totalAmount || booking.priceDetails.totalAmount;
      const partialPercentage = booking.paymentDetails?.partialPaymentPercentage || 25;
      paymentAmount = Math.round((totalAmount * partialPercentage) / 100);
    }
    
    paymentTypeForHistory = "partial";
  } else if (paymentType === "remaining") {
    // Calculate remaining payment amount
    if (booking.paymentStatus !== "partial") {
      throw new ApiError("No partial payment found. Cannot process remaining payment.", 400);
    }
    
    // For COMBINED bookings, calculate actual remaining from payment history
    if (booking.paymentGroupId) {
      // Get all bookings in this payment group
      const allBookings = await Booking.find({
        paymentGroupId: booking.paymentGroupId,
      }).select("priceDetails paymentDetails");

      // Calculate combined total
      const combinedTotal = allBookings.reduce(
        (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
        0
      );

      // Calculate actual paid amount from payment history
      let actualPaid = 0;
      const paymentHistory = booking.paymentDetails?.paymentHistory || [];
      for (const payment of paymentHistory) {
        if (payment.status === "completed") {
          actualPaid += payment.amount || 0;
        }
      }

      // Remaining is combined total minus actual paid
      paymentAmount = Math.round(combinedTotal - actualPaid);
    } else {
      // Single booking - use database value
      paymentAmount = booking.paymentDetails?.remainingAmount || 0;
    }
    
    paymentTypeForHistory = "remaining";
    
    if (paymentAmount <= 0) {
      throw new ApiError("No remaining amount to pay", 400);
    }
  } else {
    // Full payment
    // For COMBINED bookings, use combined total
    if (booking.paymentGroupId) {
      const allBookings = await Booking.find({
        paymentGroupId: booking.paymentGroupId,
      }).select("priceDetails");

      paymentAmount = allBookings.reduce(
        (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
        0
      );
    } else {
      // Single booking
      paymentAmount = booking.paymentDetails?.totalAmount || booking.priceDetails.totalAmount;
    }
    
    paymentTypeForHistory = "full";
  }

  // Create Razorpay order
  // Receipt format: type_last8chars_timestamp (max 40 chars for Razorpay)
  const paymentTypeCode = paymentType === "partial" ? "P" : paymentType === "remaining" ? "R" : "F";
  const bookingIdShort = booking._id.toString().slice(-8); // Last 8 chars of booking ID
  const timestampShort = Date.now().toString().slice(-10); // Last 10 digits of timestamp
  
  const options = {
    amount: Math.round(paymentAmount * 100), // amount in smallest currency unit (paise) - must be integer
    currency: "INR",
    receipt: `${paymentTypeCode}_${bookingIdShort}_${timestampShort}`, // Max 20 chars
    payment_capture: 1, // auto capture
  };

  console.log("payments about to end");

  const order = await razorpay.orders.create(options);

  // Store payment intent in booking for verification later
  if (!booking.paymentDetails) {
    booking.paymentDetails = {
      totalAmount: booking.priceDetails.totalAmount,
      paidAmount: 0,
      remainingAmount: booking.priceDetails.totalAmount,
      partialPaymentPercentage: 25,
      paymentHistory: []
    };
  }

  // Add pending payment to history
  booking.paymentDetails.paymentHistory.push({
    paymentId: order.id,
    amount: paymentAmount,
    paymentType: paymentTypeForHistory,
    razorpayOrderId: order.id,
    status: "pending",
    createdAt: new Date()
  });

  await booking.save();

  res.status(200).json({
    success: true,
    data: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      bookingId: booking._id,
      paymentType: paymentTypeForHistory,
      paymentAmount: paymentAmount,
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
  // Receipt format: EXT_last8chars_timestamp (max 40 chars for Razorpay)
  const bookingIdShort = booking._id.toString().slice(-8);
  const timestampShort = Date.now().toString().slice(-10);
  
  const razorpayOptions = {
    amount: Math.round(additionalAmount * 100), // in paise (₹ → paise) - must be integer
    currency: "INR",
    receipt: `EXT_${bookingIdShort}_${timestampShort}`, // Max 23 chars
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
  // Receipt format: ORD_last12chars (max 40 chars for Razorpay)
  const orderIdShort = order._id.toString().slice(-12);
  
  const options = {
    amount: Math.round(order.priceDetails.totalAmount * 100), // amount in smallest currency unit (paise) - must be integer
    currency: "INR",
    receipt: `ORD_${orderIdShort}`, // Max 16 chars
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

// @desc    Verify payment for booking (supports partial and full payment)
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

  // Get booking with details populated
  const booking = await Booking.findById(req.params.id)
    .populate("user")
    .populate("bike")
    .populate("hostel")
    .populate("bikeItems.bike");

  if (!booking) throw new ApiError("Booking not found", 404);

  // Find the payment in history
  const paymentHistoryItem = booking.paymentDetails?.paymentHistory?.find(
    (payment) => payment.razorpayOrderId === razorpay_order_id
  );

  if (!paymentHistoryItem) {
    throw new ApiError("Payment record not found", 404);
  }

  // Update payment history item
  paymentHistoryItem.razorpayPaymentId = razorpay_payment_id;
  paymentHistoryItem.status = "completed";
  paymentHistoryItem.paidAt = new Date();

  // Track the paid amount for response
  let paidAmount = paymentHistoryItem.amount;

  // For COMBINED bookings with remaining payment, update ALL bookings in the group
  if (booking.paymentGroupId && paymentHistoryItem.paymentType === "remaining") {
    // Get all bookings in the payment group
    const allBookings = await Booking.find({
      paymentGroupId: booking.paymentGroupId,
    });

    const totalGroupAmount = allBookings.reduce(
      (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
      0
    );

    // Update each booking proportionally
    for (const b of allBookings) {
      const proportion = b.priceDetails.totalAmount / totalGroupAmount;
      const proportionalPayment = Math.round(paymentHistoryItem.amount * proportion);

      // Find or add payment history item for this booking
      const existingPayment = b.paymentDetails.paymentHistory.find(
        (p) => p.razorpayOrderId === razorpay_order_id
      );

      if (existingPayment) {
        existingPayment.razorpayPaymentId = razorpay_payment_id;
        existingPayment.status = "completed";
        existingPayment.paidAt = new Date();
        existingPayment.amount = proportionalPayment;
      } else {
        b.paymentDetails.paymentHistory.push({
          paymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount: proportionalPayment,
          paymentType: "remaining",
          status: "completed",
          paidAt: new Date(),
          createdAt: new Date(),
        });
      }

      // Update payment details
      b.paymentDetails.paidAmount += proportionalPayment;
      b.paymentDetails.remainingAmount = Math.max(
        0,
        b.paymentDetails.totalAmount - b.paymentDetails.paidAmount
      );
      b.paymentStatus = "completed";
      b.bookingStatus = "confirmed";

      await b.save();
    }
  } else {
    // Single booking or partial payment - update only this booking
    booking.paymentDetails.paidAmount += paidAmount;
    booking.paymentDetails.remainingAmount = Math.max(
      0,
      booking.paymentDetails.totalAmount - booking.paymentDetails.paidAmount
    );

    // Determine payment status
    if (paymentHistoryItem.paymentType === "partial") {
      booking.paymentStatus = "partial";
      booking.bookingStatus = "confirmed"; // Confirm booking on partial payment
    } else if (
      paymentHistoryItem.paymentType === "remaining" ||
      paymentHistoryItem.paymentType === "full"
    ) {
      booking.paymentStatus = "completed";
      booking.bookingStatus = "confirmed";
    }
  }

  // Set primary payment ID for backward compatibility
  if (!booking.paymentId) {
    booking.paymentId = razorpay_payment_id;
  }

  await booking.save();

  // Prepare email content using dynamic template
  const user = booking.user;
  const isPartialPayment = paymentHistoryItem.paymentType === "partial";
  const isRemainingPayment = paymentHistoryItem.paymentType === "remaining";
  
  let emailSubject;
  let emailContent;
  
  // Only send full booking confirmation email for first payment (partial or full)
  if (isPartialPayment || paymentHistoryItem.paymentType === "full") {
    emailSubject = isPartialPayment 
      ? "🎉 Booking Confirmed with Partial Payment - Happy Go"
      : "🎉 Booking Confirmed - Full Payment - Happy Go";

    // Generate rich HTML email using template
    try {
      emailContent = generateBookingConfirmationEmail({
        bookingType: booking.bookingType,
        booking: booking,
        user: user,
        bikeDetails: booking.bike || (booking.bikeItems && booking.bikeItems[0]?.bike),
        hostelDetails: booking.hostel,
        priceDetails: {
          basePrice: booking.priceDetails?.basePrice,
          subtotal: booking.priceDetails?.subtotal,
          helmetCharges: booking.priceDetails?.helmetCharges,
          taxes: booking.priceDetails?.taxes,
          gst: booking.priceDetails?.gst,
          gstPercentage: booking.priceDetails?.gstPercentage || 5,
          discount: booking.priceDetails?.discount || 0,
          totalAmount: booking.priceDetails?.totalAmount,
        },
      });
    } catch (templateError) {
      console.error("❌ Template generation failed, using fallback:", templateError);
      // Fallback to simple email
      emailContent = `
        <h1>Booking Confirmed${isPartialPayment ? " - Partial Payment Received" : ""}</h1>
        <p>Dear ${user.name},</p>
        <p>Your ${booking.bookingType} booking has been confirmed!</p>
        <p>Booking ID: ${booking._id}</p>
        <p>Amount Paid: ₹${paidAmount}</p>
        ${isPartialPayment ? `<p>Remaining Amount: ₹${booking.paymentDetails.remainingAmount}</p>` : ""}
        <p>Thank you for choosing HappyGo!</p>
      `;
    }
  } else if (isRemainingPayment) {
    // Simple email for remaining payment
    emailSubject = "✅ Full Payment Completed - Happy Go";
    emailContent = `
      <h1>Payment Completed Successfully</h1>
      <p>Dear ${user.name},</p>
      <p>Your remaining payment has been processed successfully!</p>
      <p>Booking ID: ${booking._id}</p>
      <p>Remaining Amount Paid: ₹${paidAmount}</p>
      <p>Total Paid: ₹${booking.paymentDetails.paidAmount}</p>
      <p>Your booking is now fully paid and confirmed.</p>
      <p>Thank you for choosing HappyGo!</p>
    `;
  }

  try {
    // Send confirmation email
    await sendEmail({
      email: user.email,
      subject: emailSubject,
      message: emailContent,
      isHtml: true,
    });

    console.log("✅ Payment confirmation email sent to:", user.email);
  } catch (emailError) {
    console.error("❌ Email sending failed:", emailError);
    // Don't throw error here, payment is already processed
  }

  res.status(200).json({
    success: true,
    message: `${paymentHistoryItem.paymentType.charAt(0).toUpperCase() + paymentHistoryItem.paymentType.slice(1)} payment verified successfully`,
    data: {
      booking: booking,
      paymentDetails: {
        paymentType: paymentHistoryItem.paymentType,
        paidAmount: paidAmount,
        totalPaid: booking.paymentDetails.paidAmount,
        remainingAmount: booking.paymentDetails.remainingAmount,
        paymentStatus: booking.paymentStatus
      }
    },
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

// @desc    Verify cart payment (for combined bike + hostel bookings)
// @route   POST /api/payments/cart/verify
// @access  Private
export const verifyCartPayment = asyncHandler(async (req, res) => {
  const {
    paymentGroupId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  // Validate required fields
  if (!paymentGroupId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError("Missing required payment verification fields", 400);
  }

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError("Invalid payment signature", 400);
  }

  // Find all bookings in this payment group
  const bookings = await Booking.find({ paymentGroupId })
    .populate("user")
    .populate("bike")
    .populate("hostel")
    .populate("bikeItems.bike");

  console.log(`📦 Found ${bookings.length} bookings for payment group: ${paymentGroupId}`);
  bookings.forEach((b, i) => {
    console.log(`   ${i + 1}. ${b.bookingType} booking (${b._id})`);
    console.log(`      Payment history entries: ${b.paymentDetails?.paymentHistory?.length || 0}`);
    b.paymentDetails?.paymentHistory?.forEach((p, j) => {
      console.log(`         ${j + 1}. Order: ${p.razorpayOrderId}, Amount: ${p.amount}, Status: ${p.status}`);
    });
  });

  if (bookings.length === 0) {
    throw new ApiError("No bookings found for this payment group", 404);
  }

  // Calculate total amount across all bookings
  const totalBookingAmount = bookings.reduce(
    (sum, b) => sum + (b.paymentDetails?.totalAmount || 0),
    0
  );

  // Update all bookings
  const updatedBookings = [];
  let totalPaidForGroup = 0;
  let hasBikes = false;
  let hasHostel = false;

  for (const booking of bookings) {
    // Find the payment history item
    const paymentItem = booking.paymentDetails?.paymentHistory?.find(
      (p) => p.razorpayOrderId === razorpay_order_id
    );

    if (!paymentItem) {
      console.error(`Payment history not found for booking ${booking._id}`);
      continue;
    }

    // The amount in paymentItem was already set proportionally when the cart order was
    // created (each booking received its share of the partial total). Do NOT
    // re-proportionalize here — that was the source of the double-division bug.
    const proportionalPayment = paymentItem.amount;

    // Mark payment history item as completed
    paymentItem.razorpayPaymentId = razorpay_payment_id;
    paymentItem.status = "completed";
    paymentItem.paidAt = new Date();
    paymentItem.paymentId = razorpay_payment_id;

    // Update booking payment details with proportional amount
    booking.paymentDetails.paidAmount += proportionalPayment;
    booking.paymentDetails.remainingAmount = Math.max(
      0,
      booking.paymentDetails.totalAmount - booking.paymentDetails.paidAmount
    );

    // Determine payment status
    if (paymentItem.paymentType === "partial") {
      booking.paymentStatus = "partial";
      booking.bookingStatus = "confirmed";
    } else if (paymentItem.paymentType === "full") {
      booking.paymentStatus = "completed";
      booking.bookingStatus = "confirmed";
    }

    // Set primary payment ID for backward compatibility
    if (!booking.paymentId) {
      booking.paymentId = razorpay_payment_id;
    }

    await booking.save();

    updatedBookings.push({
      bookingId: booking._id,
      type: booking.bookingType,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      paidAmount: proportionalPayment,
      remainingAmount: booking.paymentDetails.remainingAmount,
    });

    totalPaidForGroup += proportionalPayment;
    if (booking.bookingType === "bike") hasBikes = true;
    if (booking.bookingType === "hostel") hasHostel = true;
  }

  // Send confirmation email
  try {
    const user = bookings[0].user;
    const isPartialPayment = bookings[0].paymentDetails.paidAmount < bookings[0].paymentDetails.totalAmount;

    let emailSubject;
    let emailContent;

    // Determine booking type for email
    let bookingTypeForEmail = "bike";
    if (hasBikes && hasHostel) {
      bookingTypeForEmail = "combined";
    } else if (hasHostel) {
      bookingTypeForEmail = "hostel";
    }

    // For combined bookings, use the template
    if (hasBikes && hasHostel) {
      emailSubject = isPartialPayment
        ? "🎉 Combined Booking Confirmed - Partial Payment - Happy Go"
        : "🎉 Combined Booking Confirmed - Full Payment - Happy Go";

      try {
        // Create a combined booking object for email template
        const bikeBooking = bookings.find((b) => b.bookingType === "bike");
        const hostelBooking = bookings.find((b) => b.bookingType === "hostel");

        const combinedBooking = {
          ...bikeBooking.toObject(),
          _id: paymentGroupId,
          hostel: hostelBooking?.hostel,
          roomType: hostelBooking?.roomType,
          mealOption: hostelBooking?.mealOption,
          numberOfBeds: hostelBooking?.numberOfBeds,
          numberOfNights: hostelBooking?.numberOfNights,
          hostelDetails: hostelBooking?.hostelDetails,
          checkIn: hostelBooking?.checkIn,
          checkOut: hostelBooking?.checkOut,
          partialPaymentPercentage: bikeBooking.paymentDetails.partialPaymentPercentage,
          paymentDetails: {
            ...bikeBooking.paymentDetails,
            totalAmount: bookings.reduce((sum, b) => sum + b.paymentDetails.totalAmount, 0),
            paidAmount: totalPaid,
            remainingAmount: bookings.reduce((sum, b) => sum + b.paymentDetails.remainingAmount, 0),
          },
        };

        emailContent = generateBookingConfirmationEmail({
          bookingType: "combined",
          booking: combinedBooking,
          user: user,
          bikeDetails: bikeBooking?.bike || (bikeBooking?.bikeItems && bikeBooking.bikeItems[0]?.bike),
          hostelDetails: hostelBooking?.hostel,
          priceDetails: {
            basePrice: bookings.reduce((sum, b) => sum + (b.priceDetails?.basePrice || b.priceDetails?.subtotal || 0), 0),
            subtotal: bookings.reduce((sum, b) => sum + (b.priceDetails?.subtotal || 0), 0),
            helmetCharges: bikeBooking?.priceDetails?.helmetCharges || 0,
            taxes: bookings.reduce((sum, b) => sum + (b.priceDetails?.taxes || b.priceDetails?.gst || 0), 0),
            gst: bookings.reduce((sum, b) => sum + (b.priceDetails?.gst || 0), 0),
            gstPercentage: 5,
            discount: 0,
            totalAmount: bookings.reduce((sum, b) => sum + b.priceDetails.totalAmount, 0),
          },
        });
      } catch (templateError) {
        console.error("❌ Template generation failed, using fallback:", templateError);
        // Fallback email
        emailContent = `
          <h1>Combined Booking Confirmed${isPartialPayment ? " - Partial Payment" : ""}</h1>
          <p>Dear ${user.name},</p>
          <p>Your combined booking (bike + hostel) has been confirmed!</p>
          <p>Payment Group ID: ${paymentGroupId}</p>
          <p>Bookings:</p>
          <ul>
            ${updatedBookings.map(b => `<li>${b.type.toUpperCase()}: ${b.bookingId}</li>`).join('')}
          </ul>
          <p>Amount Paid: ₹${totalPaid}</p>
          ${isPartialPayment ? `<p>Remaining Amount: ₹${updatedBookings[0].remainingAmount}</p>` : ""}
          <p>Thank you for choosing HappyGo!</p>
        `;
      }
    } else {
      // Single booking type (bike or hostel only)
      emailSubject = isPartialPayment
        ? `🎉 ${hasBikes ? "Bike" : "Hostel"} Booking Confirmed - Partial Payment - Happy Go`
        : `🎉 ${hasBikes ? "Bike" : "Hostel"} Booking Confirmed - Full Payment - Happy Go`;

      try {
        emailContent = generateBookingConfirmationEmail({
          bookingType: hasBikes ? "bike" : "hostel",
          booking: bookings[0],
          user: user,
          bikeDetails: bookings[0].bike || (bookings[0].bikeItems && bookings[0].bikeItems[0]?.bike),
          hostelDetails: bookings[0].hostel,
          priceDetails: {
            basePrice: bookings[0].priceDetails?.basePrice || bookings[0].priceDetails?.subtotal,
            subtotal: bookings[0].priceDetails?.subtotal,
            helmetCharges: bookings[0].priceDetails?.helmetCharges || 0,
            taxes: bookings[0].priceDetails?.taxes || bookings[0].priceDetails?.gst,
            gst: bookings[0].priceDetails?.gst,
            gstPercentage: 5,
            discount: 0,
            totalAmount: bookings[0].priceDetails.totalAmount,
          },
        });
      } catch (templateError) {
        console.error("❌ Template generation failed, using fallback:", templateError);
        emailContent = `
          <h1>${hasBikes ? "Bike" : "Hostel"} Booking Confirmed</h1>
          <p>Dear ${user.name},</p>
          <p>Your booking has been confirmed!</p>
          <p>Booking ID: ${bookings[0]._id}</p>
          <p>Amount Paid: ₹${totalPaid}</p>
          ${isPartialPayment ? `<p>Remaining Amount: ₹${bookings[0].paymentDetails.remainingAmount}</p>` : ""}
          <p>Thank you for choosing HappyGo!</p>
        `;
      }
    }

    await sendEmail({
      email: user.email,
      subject: emailSubject,
      message: emailContent,
      isHtml: true,
    });

    console.log("✅ Payment confirmation email sent to:", user.email);
  } catch (emailError) {
    console.error("❌ Email sending failed:", emailError);
    // Don't throw error, payment is already processed
  }

  res.status(200).json({
    success: true,
    data: {
      paymentGroupId,
      bookings: updatedBookings,
      totalPaid: totalPaidForGroup,
      remainingAmount: updatedBookings[0]?.remainingAmount || 0,
      allConfirmed: updatedBookings.every((b) => b.bookingStatus === "confirmed"),
    },
    message: `Payment verified successfully! ${updatedBookings.length} booking(s) confirmed.`,
  });
});
