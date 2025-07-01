export function calculatePriceForBike({
  bike,
  startDate,
  endDate,
  startTime,
  endTime,
  isUnlimited,
  TAX_RATE = 0,
  discount = 0,
}) {
  // 1. Convert startDate/endDate → midnight‐normalized Date objects
  const sDate = new Date(startDate);
  sDate.setHours(0, 0, 0, 0);
  const eDate = new Date(endDate);
  eDate.setHours(0, 0, 0, 0);

  // 2. Compute rentalDays = calendar days (minimum 1)
  const msPerDay = 1000 * 60 * 60 * 24;
  let rentalDays = Math.ceil((eDate.getTime() - sDate.getTime()) / msPerDay);
  if (rentalDays <= 0) rentalDays = 1;

  // 3. Pick perDayRate (limitedKm vs unlimited)
  let perDayRate;
  if (isUnlimited) {
    if (!bike.pricePerDay.unlimited.isActive) {
      throw new Error("Unlimited‐km mode not active for this bike");
    }
    perDayRate = bike.pricePerDay.unlimited.price;
  } else {
    if (!bike.pricePerDay.limitedKm.isActive) {
      throw new Error("Limited‐km mode not active for this bike");
    }
    perDayRate = bike.pricePerDay.limitedKm.price;
  }

  // 4. basePrice = rentalDays × perDayRate
  const basePrice = rentalDays * perDayRate;

  // 5. Parse the hours from "HH:mm"
  const [sh] = startTime.split(":").map((n) => parseInt(n, 10));
  const [eh] = endTime.split(":").map((n) => parseInt(n, 10));

  // 6. earlyPickupFee: if startHour < 7, charge ₹100/hr
  const NORMAL_PICKUP_HOUR = 7;
  let earlyPickupFee = 0;
  if (sh < NORMAL_PICKUP_HOUR) {
    const hrsEarly = NORMAL_PICKUP_HOUR - sh;
    earlyPickupFee = hrsEarly * 100;
  }

  // 7. lateDropFee: if endHour > 18, charge ₹100/hr
  const NORMAL_DROPOFF_HOUR = 18;
  let lateDropFee = 0;
  if (eh > NORMAL_DROPOFF_HOUR) {
    const hrsLate = eh - NORMAL_DROPOFF_HOUR;
    lateDropFee = hrsLate * 100;
  }

  // 8. Subtotal before tax/discount
  const subTotal = basePrice + earlyPickupFee + lateDropFee;

  // 9. Compute taxes if any
  const taxes = Math.round(subTotal * TAX_RATE);

  // 10. Compute final total
  const totalAmount = subTotal + taxes - discount;

  // 11. extraAmount = sum of early+late fees
  const extraAmount = earlyPickupFee + lateDropFee;

  return {
    basePrice,
    earlyPickupFee,
    lateDropFee,
    taxes,
    discount,
    totalAmount,
    extraAmount,
  };
}

export function calculateExtraAmount({
  bike,
  startTime,
  endTime,
  isUnlimited,
}) {
  // 1. Check that the chosen mode is active. We don’t need per-day rate here,
  //    but we enforce the same “mode must be active” rule.
  // if (isUnlimited) {
  //   if (!bike.pricePerDay.unlimited.isActive) {
  //     throw new Error("Unlimited-km mode not active for this bike");
  //   }
  // } else {
  //   if (!bike.pricePerDay.limitedKm.isActive) {
  //     throw new Error("Limited-km mode not active for this bike");
  //   }
  // }

  // 2. Parse the “HH:mm” strings into integer hours
  const [sh] = startTime.split(":").map((n) => parseInt(n, 10));
  const [eh] = endTime.split(":").map((n) => parseInt(n, 10));

  // 3. Compute earlyPickupFee: if startHour < 7, charge ₹100/hr
  const NORMAL_PICKUP_HOUR = 7;
  let earlyPickupFee = 0;
  if (sh < NORMAL_PICKUP_HOUR) {
    const hrsEarly = NORMAL_PICKUP_HOUR - sh;
    earlyPickupFee = hrsEarly * 100;
  }

  // 4. Compute lateDropFee: if endHour > 18, charge ₹100/hr
  const NORMAL_DROPOFF_HOUR = 18;
  let lateDropFee = 0;
  if (eh > NORMAL_DROPOFF_HOUR) {
    const hrsLate = eh - NORMAL_DROPOFF_HOUR;
    lateDropFee = hrsLate * 100;
  }

  // 5. Sum and return
  return earlyPickupFee + lateDropFee;
}
