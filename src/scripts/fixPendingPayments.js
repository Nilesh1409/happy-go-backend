import mongoose from "mongoose";
import dotenv from "dotenv";
import Booking from "../models/booking.model.js";
import Razorpay from "razorpay";

dotenv.config();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

async function fixPendingPayments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all bookings with pending payments in history
    const bookings = await Booking.find({
      "paymentDetails.paymentHistory": {
        $elemMatch: { status: "pending" },
      },
    });

    console.log(`\n📦 Found ${bookings.length} bookings with pending payments\n`);

    for (const booking of bookings) {
      console.log(`\n🔍 Processing Booking: ${booking._id}`);
      console.log(`   Type: ${booking.bookingType}`);
      console.log(`   Payment Status: ${booking.paymentStatus}`);

      // Get pending payment history items
      const pendingPayments = booking.paymentDetails.paymentHistory.filter(
        (p) => p.status === "pending"
      );

      for (const payment of pendingPayments) {
        console.log(`\n   📝 Pending Payment:`);
        console.log(`      Order ID: ${payment.razorpayOrderId}`);
        console.log(`      Amount: ₹${payment.amount}`);
        console.log(`      Created: ${payment.createdAt}`);

        try {
          // Fetch order details from Razorpay
          const razorpayOrder = await razorpay.orders.fetch(
            payment.razorpayOrderId
          );

          console.log(`      Razorpay Status: ${razorpayOrder.status}`);
          console.log(`      Amount Paid: ${razorpayOrder.amount_paid / 100}`);

          // Check if payment was actually completed on Razorpay
          if (razorpayOrder.status === "paid") {
            console.log(`\n      ✅ Payment was completed on Razorpay!`);

            // Fetch payment details
            const payments = await razorpay.orders.fetchPayments(
              payment.razorpayOrderId
            );

            if (payments.items && payments.items.length > 0) {
              const razorpayPayment = payments.items[0];
              console.log(`      Payment ID: ${razorpayPayment.id}`);

              // Update payment history
              payment.razorpayPaymentId = razorpayPayment.id;
              payment.status = "completed";
              payment.paidAt = new Date(razorpayPayment.created_at * 1000);
              payment.paymentId = razorpayPayment.id;

              // Update booking payment details
              booking.paymentDetails.paidAmount += payment.amount;
              booking.paymentDetails.remainingAmount = Math.max(
                0,
                booking.paymentDetails.totalAmount -
                  booking.paymentDetails.paidAmount
              );

              // Update payment and booking status
              if (payment.paymentType === "partial") {
                booking.paymentStatus = "partial";
                booking.bookingStatus = "confirmed";
              } else if (
                payment.paymentType === "remaining" ||
                payment.paymentType === "full"
              ) {
                booking.paymentStatus = "completed";
                booking.bookingStatus = "confirmed";
              }

              // Set primary payment ID if not set
              if (!booking.paymentId) {
                booking.paymentId = razorpayPayment.id;
              }

              await booking.save();

              console.log(`      ✅ Booking updated successfully!`);
              console.log(`      New Payment Status: ${booking.paymentStatus}`);
              console.log(`      New Booking Status: ${booking.bookingStatus}`);
              console.log(
                `      Paid Amount: ₹${booking.paymentDetails.paidAmount}`
              );
              console.log(
                `      Remaining: ₹${booking.paymentDetails.remainingAmount}`
              );
            } else {
              console.log(`      ⚠️  No payment details found on Razorpay`);
            }
          } else if (razorpayOrder.status === "created") {
            console.log(`      ⚠️  Payment was never completed (abandoned)`);
            console.log(`      Recommendation: Keep as pending or mark as failed`);
          } else if (razorpayOrder.status === "attempted") {
            console.log(`      ⚠️  Payment was attempted but not successful`);
            console.log(`      Recommendation: Mark as failed`);
          }
        } catch (error) {
          console.error(`      ❌ Error fetching from Razorpay:`, error.message);
        }
      }
    }

    console.log("\n✅ Script completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the script
fixPendingPayments();




