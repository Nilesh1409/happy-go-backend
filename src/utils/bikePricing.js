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

export function calculateRentalPricing({
  bike,
  startDate,
  startTime,
  endDate,
  endTime,
  kmOption = "limited",
}) {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  const isWeekendBooking = hasWeekendInRange(start, end);
  const totalHours = (end - start) / (1000 * 60 * 60);
  const totalDays = Math.ceil(totalHours / 24);

  let basePrice = 0;
  let breakdown = {
    type: "",
    duration: "",
    basePrice: 0,
    extraCharges: 0,
    subtotal: 0,
    gst: 0,
    total: 0,
  };

  if (isWeekendBooking) {
    basePrice = bike.pricePerDay.unlimited.price * totalDays;
    breakdown.type = "weekend";
    breakdown.duration = `${totalDays} day(s)`;
    kmOption = "unlimited";

    if (!bike.pricePerDay.unlimited.isActive) {
      throw new Error("Weekend bookings require unlimited km option");
    }
  } else {
    if (totalHours <= 5) {
      const fullPrice =
        kmOption === "unlimited"
          ? bike.pricePerDay.unlimited.price
          : bike.pricePerDay.limitedKm.price;

      basePrice = fullPrice * 0.5;
      breakdown.type = "weekday_short";
      breakdown.duration = `${totalHours.toFixed(1)} hours`;
    } else {
      basePrice =
        kmOption === "unlimited"
          ? bike.pricePerDay.unlimited.price * totalDays
          : bike.pricePerDay.limitedKm.price * totalDays;

      breakdown.type = "weekday_full";
      breakdown.duration = `${totalDays} day(s)`;
    }

    const selectedOption =
      kmOption === "unlimited"
        ? bike.pricePerDay.unlimited
        : bike.pricePerDay.limitedKm;

    if (!selectedOption.isActive) {
      throw new Error(`${kmOption} km option not available`);
    }
  }

  const extraCharges = calculateTimeBasedCharges(startTime, endTime);
  const subtotal = basePrice + extraCharges;
  const gstPercentage = 5; // 5% GST
  const gst = subtotal * (gstPercentage / 100);
  const total = subtotal + gst;

  breakdown.basePrice = basePrice;
  breakdown.extraCharges = extraCharges;
  breakdown.subtotal = subtotal;
  breakdown.gst = Math.round(gst * 100) / 100; // Round to 2 decimal places
  breakdown.gstPercentage = gstPercentage; // Include GST percentage
  breakdown.total = Math.round(total * 100) / 100; // Round to 2 decimal places

  return {
    totalPrice: breakdown.total,
    breakdown,
    kmOption,
    isWeekendBooking,
  };
}

function hasWeekendInRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    if (
      dayOfWeek === 5 ||
      dayOfWeek === 6 ||
      dayOfWeek === 0 ||
      dayOfWeek === 1
    ) {
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
