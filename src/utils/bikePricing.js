export function calculateExtraAmount({
  bike,
  startTime,
  endTime,
  isUnlimited,
}) {
  const [sh] = startTime.split(":").map((n) => Number.parseInt(n, 10));
  const [eh] = endTime.split(":").map((n) => Number.parseInt(n, 10));

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

// Updated weekend logic - only Saturday and Sunday
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// Check if booking period has any weekend days
function hasWeekendInRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isWeekend(current)) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }

  return false;
}

// Check for special pricing periods
function getSpecialPricing(bike, startDate, endDate, kmOption) {
  if (!bike.specialPricing || bike.specialPricing.length === 0) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Find active special pricing periods that overlap with booking period
  for (const special of bike.specialPricing) {
    if (!special.isActive) continue;

    const specialStart = new Date(special.startDate);
    const specialEnd = new Date(special.endDate);

    // Check if booking period overlaps with special period
    if (start <= specialEnd && end >= specialStart) {
      const pricingOption =
        special.pricing?.[kmOption === "limited" ? "limitedKm" : "unlimited"];

      if (pricingOption?.isActive && pricingOption?.price) {
        return {
          price: pricingOption.price,
          kmLimit: pricingOption.kmLimit,
          name: special.name,
        };
      }
    }
  }

  return null;
}

// Calculate surge pricing based on total daily bookings
async function getSurgeMultiplier(startDate, endDate) {
  try {
    const { default: Booking } = await import("../models/booking.model.js");

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Count total bike bookings for the period
    const totalBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      },
      {
        $unwind: "$bikeItems",
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$bikeItems.quantity" },
        },
      },
    ]);

    const totalBikes = totalBookings[0]?.totalQuantity || 0;

    // Apply surge pricing - 5% increase for every 5 bookings
    if (totalBikes >= 5) {
      const surgeGroups = Math.floor(totalBikes / 5);
      const surgePercentage = surgeGroups * 5; // 5% per group of 5 bookings
      return 1 + surgePercentage / 100;
    }

    return 1; // No surge
  } catch (error) {
    console.error("Error calculating surge multiplier:", error);
    return 1;
  }
}

// Calculate bulk discount for multiple bikes
function calculateBulkDiscount(totalQuantity, bike) {
  if (totalQuantity < 2) return { percentage: 0, amount: 0 };

  const discounts = bike.bulkDiscounts || {
    twoOrMore: 2,
    threeToFour: 4,
    fiveOrMore: 10,
  };

  let percentage = totalQuantity * 2;

  // if (totalQuantity >= 5) {
  //   percentage = discounts.fiveOrMore
  // } else if (totalQuantity >= 3) {
  //   percentage = discounts.threeToFour
  // } else if (totalQuantity >= 2) {
  //   percentage = discounts.twoOrMore
  // }

  return { percentage, amount: 0 }; // Amount will be calculated later
}

export async function calculateRentalPricing({
  bike,
  startDate,
  startTime,
  endDate,
  endTime,
  kmOption = "limited",
  quantity = 1,
}) {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  const isWeekendBooking = hasWeekendInRange(start, end);
  const totalHours = (end - start) / (1000 * 60 * 60);

  // Calculate days based on date changes
  const startDateOnly = new Date(startDate);
  const endDateOnly = new Date(endDate);
  const daysDifference =
    Math.ceil((endDateOnly - startDateOnly) / (1000 * 60 * 60 * 24)) + 1;

  // Get surge multiplier
  const surgeMultiplier = await getSurgeMultiplier(startDate, endDate);

  let basePrice = 0;
  const breakdown = {
    type: "",
    duration: "",
    basePrice: 0,
    quantity: quantity,
    pricePerUnit: 0,
    extraCharges: 0,
    subtotal: 0,
    bulkDiscount: { percentage: 0, amount: 0 },
    specialPricing: null,
    gst: 0,
    gstPercentage: 5,
    total: 0,
  };

  // Check for special pricing first
  const specialPricing = getSpecialPricing(bike, startDate, endDate, kmOption);
  let selectedOption = null;

  if (specialPricing) {
    // Use special pricing
    selectedOption = {
      price: specialPricing.price,
      kmLimit: specialPricing.kmLimit,
      isActive: true,
    };
    breakdown.specialPricing = specialPricing.name;
  } else {
    // Use regular weekday/weekend pricing
    const pricingCategory = isWeekendBooking ? "weekend" : "weekday";
    selectedOption =
      bike.pricePerDay?.[pricingCategory]?.[
        kmOption === "limited" ? "limitedKm" : "unlimited"
      ];
  }

  if (!selectedOption?.isActive || !selectedOption?.price) {
    const pricingType = specialPricing
      ? "special date"
      : isWeekendBooking
      ? "weekend"
      : "weekday";
    throw new Error(
      `${kmOption} km option not available for ${pricingType} or pricing not configured`
    );
  }

  // Calculate base price per unit
  let pricePerUnit = 0;

  if (
    totalHours <= 5 &&
    !isWeekendBooking &&
    daysDifference === 1 &&
    !specialPricing
  ) {
    // Short weekday booking within same day (50% of daily rate) - only for regular pricing
    pricePerUnit = selectedOption.price * 0.5;
    breakdown.type = "weekday_short";
    breakdown.duration = `${totalHours.toFixed(1)} hours`;
  } else {
    // Full day pricing based on date changes
    pricePerUnit = selectedOption.price * daysDifference;
    if (specialPricing) {
      breakdown.type = "special_date";
    } else {
      breakdown.type = isWeekendBooking ? "weekend" : "weekday_full";
    }
    breakdown.duration = `${daysDifference} day(s)`;
  }

  // Apply surge multiplier directly to the base rental price
  pricePerUnit = pricePerUnit * surgeMultiplier;

  breakdown.pricePerUnit = pricePerUnit;
  basePrice = pricePerUnit * quantity;
  breakdown.basePrice = basePrice;

  // Calculate extra charges (per booking, not per bike)
  const extraCharges = calculateTimeBasedCharges(startTime, endTime);
  breakdown.extraCharges = extraCharges;

  // Calculate subtotal before discounts
  const subtotal = basePrice + extraCharges;
  breakdown.subtotal = subtotal;

  // Calculate bulk discount
  const bulkDiscount = calculateBulkDiscount(quantity, bike);
  bulkDiscount.amount = (subtotal * bulkDiscount.percentage) / 100;
  breakdown.bulkDiscount = bulkDiscount;

  // Apply bulk discount
  const afterDiscount = subtotal - bulkDiscount.amount;

  // Calculate GST
  const gstPercentage = 5;
  const gst = afterDiscount * (gstPercentage / 100);
  breakdown.gst = Math.round(gst * 100) / 100;
  breakdown.gstPercentage = gstPercentage;

  // Calculate final total
  const total = afterDiscount + breakdown.gst;
  breakdown.total = Math.round(total * 100) / 100;

  return {
    totalPrice: breakdown.total,
    breakdown,
    kmOption,
    isWeekendBooking,
    quantity,
  };
}

// Calculate cart pricing with surge and bulk discounts
export async function calculateCartPricing({
  items,
  startDate,
  startTime,
  endDate,
  endTime,
  helmetQuantity = 0,
}) {
  let subtotal = 0;
  let totalQuantity = 0;
  const itemPricing = [];

  // Calculate pricing for each item
  for (const item of items) {
    try {
      const pricing = await calculateRentalPricing({
        bike: item.bike,
        startDate,
        startTime,
        endDate,
        endTime,
        kmOption: item.kmOption,
        quantity: item.quantity,
      });

      itemPricing.push({
        bikeId: item.bike._id,
        quantity: item.quantity,
        kmOption: item.kmOption,
        pricePerUnit: pricing.breakdown.pricePerUnit,
        totalPrice: pricing.totalPrice,
        totalPriceWithoutGst: pricing?.breakdown?.subtotal,
        breakdown: pricing.breakdown,
      });

      subtotal += pricing?.breakdown?.subtotal;
      totalQuantity += item.quantity;
      console.log("Cart item pricing:", {
        bikeId: item.bike._id,
        kmOption: item.kmOption,
        pricePerUnit: pricing.breakdown.pricePerUnit,
        totalPrice: pricing.totalPrice,
      });
    } catch (error) {
      console.error(`Error calculating pricing for item:`, {
        bikeId: item.bike._id,
        kmOption: item.kmOption,
        error: error.message,
      });

      // Add item with zero pricing to maintain cart structure
      itemPricing.push({
        bikeId: item.bike._id,
        quantity: item.quantity,
        kmOption: item.kmOption,
        pricePerUnit: 0,
        totalPrice: 0,
        totalPriceWithoutGst: 0,
        breakdown: null,
        error: error.message,
      });

      totalQuantity += item.quantity;
    }
  }

  // Calculate overall bulk discount
  let bulkDiscount = { percentage: 0, amount: 0 };
  if (totalQuantity >= 2) {
    // Use the first bike's discount settings as default
    const firstBike = items[0]?.bike;
    if (firstBike) {
      bulkDiscount = calculateBulkDiscount(totalQuantity, firstBike);
      bulkDiscount.amount = (subtotal * bulkDiscount.percentage) / 100;
    }
  }

  // Apply bulk discount
  const afterBulkDiscount = subtotal - bulkDiscount.amount;

  // Calculate extra charges (once per booking)
  const extraCharges = calculateTimeBasedCharges(startTime, endTime);

  // Calculate helmet charges
  const { default: Helmet } = await import("../models/helmet.model.js");
  let helmetCharges = 0;
  let helmetMessage = "";
  if (helmetQuantity > 0) {
    const helmet = await Helmet.findOne({ isActive: true });
    if (helmet) {
      // Give 1 free helmet per bike booked
      const freeHelmets = totalQuantity;
      const chargeableHelmets = Math.max(0, helmetQuantity - freeHelmets);
      helmetCharges = chargeableHelmets * helmet.pricePerHelmet;

      // Create informative message
      if (chargeableHelmets > 0) {
        helmetMessage = `${freeHelmets} helmet(s) free (1 per bike), ${chargeableHelmets} additional helmet(s) charged at ₹${helmet.pricePerHelmet} each`;
      } else {
        helmetMessage = `${helmetQuantity} helmet(s) free (1 per bike included)`;
      }
    } else {
      helmetMessage = "Helmet pricing not configured";
    }
  } else {
    helmetMessage = "No helmets requested";
  }

  // Calculate total before GST (surge is now applied directly to rental prices)
  const beforeGst = afterBulkDiscount + extraCharges + helmetCharges;

  // Calculate GST
  const gstPercentage = 5;
  const gst = beforeGst * (gstPercentage / 100);

  // Calculate final total
  const total = beforeGst + gst;

  return {
    itemPricing,
    subtotal,
    totalQuantity,
    bulkDiscount,
    extraCharges,
    helmetCharges,
    helmetMessage,
    gst: Math.round(gst * 100) / 100,
    gstPercentage,
    total: Math.round(total * 100) / 100,
    savings: bulkDiscount.amount,
  };
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
