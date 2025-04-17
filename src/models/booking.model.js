import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingType: {
      type: String,
      required: [true, "Please add a booking type"],
      enum: ["bike", "hotel"],
    },
    bike: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
      required: function () {
        return this.bookingType === "bike";
      },
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: function () {
        return this.bookingType === "hotel";
      },
    },
    roomType: {
      type: String,
      required: function () {
        return this.bookingType === "hotel";
      },
    },
    startDate: {
      type: Date,
      required: [true, "Please add a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please add an end date"],
    },
    startTime: {
      type: String,
      required: function () {
        return this.bookingType === "bike";
      },
    },
    endTime: {
      type: String,
      required: function () {
        return this.bookingType === "bike";
      },
    },
    numberOfPeople: {
      type: Number,
      required: function () {
        return this.bookingType === "hotel";
      },
      min: [1, "Number of people must be at least 1"],
    },
    priceDetails: {
      basePrice: {
        type: Number,
        required: [true, "Please add a base price"],
      },
      taxes: {
        type: Number,
        required: [true, "Please add taxes"],
      },
      discount: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        required: [true, "Please add a total amount"],
      },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentId: {
      type: String,
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    bikeDetails: {
      kmLimit: {
        type: Number,
        required: function () {
          return this.bookingType === "bike";
        },
      },
      isUnlimited: {
        type: Boolean,
        required: function () {
          return this.bookingType === "bike";
        },
      },
      additionalKmPrice: {
        type: Number,
        required: function () {
          return this.bookingType === "bike";
        },
      },
      documentsSubmitted: {
        idProof: {
          type: String,
        },
        drivingLicense: {
          type: String,
        },
        addressProof: {
          type: String,
        },
      },
      finalKmReading: {
        type: Number,
      },
      initialKmReading: {
        type: Number,
      },
      additionalCharges: {
        amount: {
          type: Number,
          default: 0,
        },
        reason: {
          type: String,
        },
      },
    },
    hotelDetails: {
      roomOption: {
        type: String,
        enum: ["bedOnly", "bedAndBreakfast", "bedBreakfastAndDinner"],
        required: function () {
          return this.bookingType === "hotel";
        },
      },
      checkInTime: {
        type: String,
      },
    },
    couponCode: {
      type: String,
    },
    specialRequests: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "processed", "rejected"],
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
