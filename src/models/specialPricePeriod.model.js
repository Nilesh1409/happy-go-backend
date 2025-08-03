import mongoose from "mongoose";

const specialPricePeriodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name for the special price period"],
      trim: true,
      unique: true,
    },
    startDate: {
      type: Date,
      required: [true, "Please add a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please add an end date"],
    },
    priceMultiplier: {
      type: Number,
      required: [true, "Please add a price multiplier"],
      min: [0, "Price multiplier cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
specialPricePeriodSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

// Validate that endDate is after startDate
specialPricePeriodSchema.pre("save", function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error("End date must be after start date"));
  } else {
    next();
  }
});

const SpecialPricePeriod = mongoose.model(
  "SpecialPricePeriod",
  specialPricePeriodSchema
);

export default SpecialPricePeriod;
