import mongoose from "mongoose";
import dotenv from "dotenv";
import Booking from "../models/booking.model.js";

dotenv.config();

const fixCombinedBookingPayments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all bookings with paymentGroupId that have payment history
    const bookings = await Booking.find({
      paymentGroupId: { $exists: true, $ne: null },
      "paymentDetails.paymentHistory.0": { $exists: true },
    }).sort({ createdAt: -1 });

    console.log(`📊 Found ${bookings.length} bookings with payment groups`);

    // Group bookings by paymentGroupId
    const groupedBookings = {};
    for (const booking of bookings) {
      if (!groupedBookings[booking.paymentGroupId]) {
        groupedBookings[booking.paymentGroupId] = [];
      }
      groupedBookings[booking.paymentGroupId].push(booking);
    }

    let fixedGroups = 0;
    let fixedBookings = 0;

    // Process each payment group
    for (const [paymentGroupId, groupBookings] of Object.entries(groupedBookings)) {
      console.log(`\n🔧 Processing payment group: ${paymentGroupId}`);
      console.log(`   Bookings in group: ${groupBookings.length}`);

      // Calculate combined total
      const combinedTotal = groupBookings.reduce(
        (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
        0
      );

      console.log(`   Combined Total: ₹${combinedTotal}`);

      // Process each booking in the group
      for (const booking of groupBookings) {
        const bookingTotal = booking.priceDetails?.totalAmount || 0;
        const proportion = bookingTotal / combinedTotal;

        console.log(`\n   📦 Booking ${booking._id} (${booking.bookingType}):`);
        console.log(`      Total: ₹${bookingTotal}`);
        console.log(`      Proportion: ${(proportion * 100).toFixed(2)}%`);

        let actualPaidAmount = 0;
        let needsFix = false;

        // Check and fix payment history
        for (let i = 0; i < booking.paymentDetails.paymentHistory.length; i++) {
          const payment = booking.paymentDetails.paymentHistory[i];
          
          if (payment.status === "completed") {
            // This payment was completed but might have wrong amount
            const currentAmount = payment.amount || 0;
            
            // Try to find the original combined payment amount
            // Look for other bookings in same group with same razorpayOrderId
            const sameOrderPayments = groupBookings
              .filter(b => b._id.toString() !== booking._id.toString())
              .flatMap(b => b.paymentDetails.paymentHistory || [])
              .filter(p => p.razorpayOrderId === payment.razorpayOrderId && p.status === "completed");

            if (sameOrderPayments.length > 0) {
              // Found related payment - calculate combined amount
              const combinedPaymentAmount = currentAmount + sameOrderPayments[0].amount;
              const correctProportionalAmount = Math.round(combinedPaymentAmount * proportion);

              if (currentAmount !== correctProportionalAmount) {
                console.log(`      ⚠️  Payment ${i}: ₹${currentAmount} → ₹${correctProportionalAmount} (fixing...)`);
                booking.paymentDetails.paymentHistory[i].amount = correctProportionalAmount;
                actualPaidAmount += correctProportionalAmount;
                needsFix = true;
              } else {
                console.log(`      ✅ Payment ${i}: ₹${currentAmount} (correct)`);
                actualPaidAmount += currentAmount;
              }
            } else {
              // No related payment found, assume current amount is correct
              console.log(`      ℹ️  Payment ${i}: ₹${currentAmount} (no related payment found)`);
              actualPaidAmount += currentAmount;
            }
          } else if (payment.status === "pending") {
            // Pending payment - might need proportional amount fix
            const currentAmount = payment.amount || 0;
            
            // Check if this is a combined payment (same amount in other bookings)
            const sameOrderPayments = groupBookings
              .filter(b => b._id.toString() !== booking._id.toString())
              .flatMap(b => b.paymentDetails.paymentHistory || [])
              .filter(p => p.razorpayOrderId === payment.razorpayOrderId);

            if (sameOrderPayments.length > 0 && currentAmount === sameOrderPayments[0].amount) {
              // This is wrong - all bookings have same amount
              // Calculate correct proportional amount
              const correctProportionalAmount = Math.round(currentAmount * proportion);
              
              if (currentAmount !== correctProportionalAmount) {
                console.log(`      ⚠️  Pending Payment ${i}: ₹${currentAmount} → ₹${correctProportionalAmount} (fixing...)`);
                booking.paymentDetails.paymentHistory[i].amount = correctProportionalAmount;
                needsFix = true;
              }
            } else {
              console.log(`      ℹ️  Pending Payment ${i}: ₹${currentAmount} (seems correct)`);
            }
          }
        }

        // Update booking's paidAmount and remainingAmount
        if (needsFix || booking.paymentDetails.paidAmount !== actualPaidAmount) {
          booking.paymentDetails.paidAmount = actualPaidAmount;
          booking.paymentDetails.remainingAmount = bookingTotal - actualPaidAmount;

          // Update payment status
          if (actualPaidAmount === 0) {
            booking.paymentStatus = "pending";
          } else if (actualPaidAmount < bookingTotal) {
            booking.paymentStatus = "partial";
          } else {
            booking.paymentStatus = "completed";
          }

          console.log(`      💾 Updating: paidAmount=₹${actualPaidAmount}, remaining=₹${booking.paymentDetails.remainingAmount}, status=${booking.paymentStatus}`);

          await booking.save();
          fixedBookings++;
        } else {
          console.log(`      ✅ No changes needed`);
        }
      }

      fixedGroups++;
    }

    console.log(`\n✅ Fixed ${fixedBookings} bookings across ${fixedGroups} payment groups`);
    console.log("✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

fixCombinedBookingPayments();

