import mongoose from "mongoose";

const helmetSchema = new mongoose.Schema(
  {
    totalQuantity: {
      type: Number,
      required: [true, "Please add total helmet quantity"],
      min: [0, "Helmet quantity cannot be negative"],
    },
    availableQuantity: {
      type: Number,
      required: [true, "Please add available helmet quantity"],
      min: [0, "Available quantity cannot be negative"],
    },
    pricePerHelmet: {
      type: Number,
      required: [true, "Please add helmet price"],
      default: 60,
    },
    freeHelmetPerBooking: {
      type: Number,
      default: 1,
      min: [0, "Free helmet count cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maintenanceHistory: [
      {
        note: String,
        date: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
helmetSchema.pre("save", function (next) {
  if (this.availableQuantity > this.totalQuantity) {
    this.availableQuantity = this.totalQuantity;
  }
  next();
});

const Helmet = mongoose.model("Helmet", helmetSchema);
export default Helmet;
