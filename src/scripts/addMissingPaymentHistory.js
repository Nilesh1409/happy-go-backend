import mongoose from "mongoose";
import dotenv from "dotenv";
import Booking from "../models/booking.model.js";

dotenv.config();

const addMissingPaymentHistory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // The specific payment group with the issue
    const paymentGroupId = "PG_1762287795223_6863916556ee5c1482baffe8";
    const missingOrderId = "order_RbnGCk3nuGlYOg";
    
    console.log(`\n🔍 Checking payment group: ${paymentGroupId}`);

    // Find all bookings in this group
    const bookings = await Booking.find({ paymentGroupId });
    
    if (bookings.length === 0) {
      console.log("❌ No bookings found");
      process.exit(1);
    }

    console.log(`📦 Found ${bookings.length} bookings`);

    // Find the booking that HAS the payment history (hostel)
    const bookingWithPayment = bookings.find(b => 
      b.paymentDetails?.paymentHistory?.some(p => p.razorpayOrderId === missingOrderId)
    );

    if (!bookingWithPayment) {
      console.log(`❌ No booking found with order ID: ${missingOrderId}`);
      process.exit(1);
    }

    // Get the payment details
    const paymentEntry = bookingWithPayment.paymentDetails.paymentHistory.find(
      p => p.razorpayOrderId === missingOrderId
    );

    console.log(`\n✅ Found payment in ${bookingWithPayment.bookingType} booking:`);
    console.log(`   Order ID: ${paymentEntry.razorpayOrderId}`);
    console.log(`   Payment ID: ${paymentEntry.razorpayPaymentId}`);
    console.log(`   Amount: ₹${paymentEntry.amount}`);
    console.log(`   Status: ${paymentEntry.status}`);

    // Calculate total amount
    const totalBookingAmount = bookings.reduce(
      (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
      0
    );

    console.log(`\n💰 Combined total: ₹${totalBookingAmount}`);

    // Find bookings missing this payment history
    const bookingsMissingPayment = bookings.filter(b => 
      !b.paymentDetails?.paymentHistory?.some(p => p.razorpayOrderId === missingOrderId)
    );

    if (bookingsMissingPayment.length === 0) {
      console.log("\n✅ All bookings already have this payment history!");
      process.exit(0);
    }

    console.log(`\n🔧 Found ${bookingsMissingPayment.length} booking(s) missing this payment:`);

    // Add payment history to missing bookings
    for (const booking of bookingsMissingPayment) {
      const bookingTotal = booking.priceDetails?.totalAmount || 0;
      const proportion = bookingTotal / totalBookingAmount;
      const proportionalAmount = Math.round(paymentEntry.amount * proportion);

      console.log(`\n   📦 ${booking.bookingType} booking (${booking._id}):`);
      console.log(`      Total: ₹${bookingTotal}`);
      console.log(`      Proportion: ${(proportion * 100).toFixed(2)}%`);
      console.log(`      Proportional payment: ₹${proportionalAmount}`);

      // Add payment history entry
      booking.paymentDetails.paymentHistory.push({
        paymentId: paymentEntry.razorpayPaymentId,
        razorpayOrderId: paymentEntry.razorpayOrderId,
        razorpayPaymentId: paymentEntry.razorpayPaymentId,
        amount: proportionalAmount,
        paymentType: paymentEntry.paymentType,
        status: paymentEntry.status,
        paidAt: paymentEntry.paidAt,
        createdAt: paymentEntry.createdAt,
      });

      // Update payment amounts if payment is completed
      if (paymentEntry.status === "completed") {
        booking.paymentDetails.paidAmount += proportionalAmount;
        booking.paymentDetails.remainingAmount = Math.max(
          0,
          booking.paymentDetails.totalAmount - booking.paymentDetails.paidAmount
        );

        // Update payment status
        if (booking.paymentDetails.paidAmount === 0) {
          booking.paymentStatus = "pending";
        } else if (booking.paymentDetails.paidAmount < booking.paymentDetails.totalAmount) {
          booking.paymentStatus = "partial";
        } else {
          booking.paymentStatus = "completed";
        }

        // Update booking status
        if (booking.paymentStatus !== "pending") {
          booking.bookingStatus = "confirmed";
        }

        // Set primary payment ID
        if (!booking.paymentId) {
          booking.paymentId = paymentEntry.razorpayPaymentId;
        }
      }

      await booking.save();

      console.log(`      ✅ Added payment history`);
      console.log(`      💾 Updated: paidAmount=₹${booking.paymentDetails.paidAmount}, remaining=₹${booking.paymentDetails.remainingAmount}`);
      console.log(`      📊 Status: ${booking.paymentStatus} / ${booking.bookingStatus}`);
    }

    console.log(`\n✅ Successfully updated ${bookingsMissingPayment.length} booking(s)!`);
    console.log("✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

addMissingPaymentHistory();

