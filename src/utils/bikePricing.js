import SpecialPricePeriod from "../models/specialPricePeriod.model.js";
import Booking from "../models/booking.model.js";

export function calculateExtraAmount({
  bike,
  startTime,
  endTime,
  isUnlimited,
}) {
  const [sh] = startTime.split(":").map((n) => parseInt(n, 10));
  const [eh] = endTime.split(":").map((n) => parseInt(n, 10));

  const NORMAL_PICKUP_HOUR = 7;
  let earlyPickupFee = 0;
  if (sh < NORMAL_PICKUP_HOUR) {
    const hrsEarly = NORMAL_PICKUP_HOUR - sh;
    earlyPickupFee = hrsEarly * 100;
  }

  const NORMAL_DROPOFF_HOUR = 18;
  let lateDropFee = 0;
  if (eh > NORMAL_DROPOFF_HOUR) {
    const hrsLate = eh - NORMAL_DROPOFF_HOUR;
    lateDropFee = hrsLate * 100;
  }

  return earlyPickupFee + lateDropFee;
}

export async function calculateRentalPricing({
  bike,
  startDate,
  startTime,
  endDate,
  endTime,
  kmOption = "limited",
}) {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  if (isNaN(start) || isNaN(end) || start >= end) {
    throw new Error("Invalid date range");
  }

  // 1. Determine booking duration
  const totalHours = (end - start) / (1000 * 60 * 60);
  const totalDays = Math.ceil(totalHours / 24);

  // 2. Check for special pricing periods
  const specialPricePeriod = await SpecialPricePeriod.findOne({
    isActive: true,
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  const priceMultiplier = specialPricePeriod
    ? specialPricePeriod.priceMultiplier
    : 1;

  // 3. Determine surge pricing based on demand
  const totalBookingsForDay = await Booking.countDocuments({
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed", "pending"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  let surgeMultiplier = 1;
  if (totalBookingsForDay >= 5 && totalBookingsForDay <= 10) {
    surgeMultiplier = 1.05; // 5% increase
  } else if (totalBookingsForDay > 10) {
    surgeMultiplier = 1.1; // 10% increase
  }

  // 4. Determine if it's a weekend booking or special date
  const isWeekendOrSpecial =
    hasWeekendInRange(start, end) || !!specialPricePeriod;

  // 5. Select the correct base price
  let priceTier;
  if (isWeekendOrSpecial) {
    priceTier = bike.pricePerDay.weekend[kmOption];
  } else {
    priceTier = bike.pricePerDay.weekday[kmOption];
  }

  if (!priceTier || !priceTier.isActive) {
    throw new Error(
      `The selected pricing option (${
        isWeekendOrSpecial ? "weekend" : "weekday"
      } ${kmOption}) is not available for this bike.`
    );
  }

  let basePricePerDay = priceTier.price;

  // 6. Calculate base price
  let basePrice;
  // Short rental discount only applies on weekdays
  if (!isWeekendOrSpecial && totalHours > 0 && totalHours <= 5) {
    basePrice = basePricePerDay * 0.5;
  } else {
    basePrice = basePricePerDay * totalDays;
  }

  // 7. Apply multipliers
  const finalBasePrice = basePrice * priceMultiplier * surgeMultiplier;

  // 8. Calculate extra charges for non-standard hours
  const extraCharges = calculateTimeBasedCharges(startTime, endTime);

  // 9. Calculate total and GST
  const subtotal = finalBasePrice + extraCharges;
  const gstPercentage = 5; // 5% GST
  const gst = subtotal * (gstPercentage / 100);
  const total = subtotal + gst;

  // 10. Construct breakdown
  const breakdown = {
    type: isWeekendOrSpecial ? "weekend/special" : "weekday",
    kmOption,
    duration: `${totalDays} day(s)`,
    basePrice: Math.round(basePrice * 100) / 100,
    specialDateMultiplier: priceMultiplier,
    surgeMultiplier: surgeMultiplier,
    finalBasePrice: Math.round(finalBasePrice * 100) / 100,
    extraCharges,
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    gstPercentage,
    total: Math.round(total * 100) / 100,
  };

  return {
    totalPrice: breakdown.total,
    breakdown,
    kmOption,
    isWeekendBooking: isWeekendOrSpecial,
  };
}

function hasWeekendInRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    if (dayOfWeek === 6 || dayOfWeek === 0) {
      // Saturday or Sunday
      return true;
    }

    current.setDate(current.getDate() + 1);
  }

  return false;
}

function calculateTimeBasedCharges(startTime, endTime) {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startDecimal = startHour + startMin / 60;
  const endDecimal = endHour + endMin / 60;

  let extraCharges = 0;

  if (startDecimal >= 5 && startDecimal <= 6.5) {
    extraCharges += 100;
  }

  if (endDecimal > 20) {
    if (endDecimal <= 22) {
      const lateHours = endDecimal - 20;
      const slots = Math.ceil(lateHours * 2);
      extraCharges += slots * 50;
    } else if (endDecimal <= 22.5) {
      extraCharges += 300;
    } else {
      throw new Error("Drop-off after 10:30 PM not allowed");
    }
  }

  return extraCharges;
}
