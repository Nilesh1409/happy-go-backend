// models/PricingConfig.js
const pricingConfigSchema = new mongoose.Schema({
  weekdayRates: {
    upTo5Hours: {
      discountPercentage: 50, // 50% of actual weekday price
    },
    fullDay: {
      // Uses bike's pricePerDay rates
    },
  },
  weekendRates: {
    // Weekend is always day-wise, unlimited km only
    dayWise: true,
    unlimitedOnly: true,
  },
  timeSlots: {
    earlyPickup: {
      startHour: 5,
      endHour: 6.5,
      extraCharge: 100,
    },
    normal: {
      startHour: 7,
      endHour: 20,
    },
    lateDrop: {
      startHour: 20.5,
      endHour: 22,
      chargePerSlot: 50, // ₹50 per 30min slot
      maxHour: 22.5,
      afterMaxCharge: 300,
    },
  },
});
