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
      helmetCharges: {
        type: Number,
        default: 0,
      },
      extraAmount: {
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
        type: mongoose.Schema.Types.Mixed,
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
      helmetQuantity: {
        type: Number,
        default: 0,
        min: [0, "Helmet quantity cannot be negative"],
      },
      helmetCharges: {
        type: Number,
        default: 0,
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
      // Modified to store quantities for each meal option
      roomOptions: {
        bedOnly: {
          quantity: {
            type: Number,
            default: 0,
          },
          pricePerUnit: {
            type: Number,
            default: 0,
          },
        },
        bedAndBreakfast: {
          quantity: {
            type: Number,
            default: 0,
          },
          pricePerUnit: {
            type: Number,
            default: 0,
          },
        },
        bedBreakfastAndDinner: {
          quantity: {
            type: Number,
            default: 0,
          },
          pricePerUnit: {
            type: Number,
            default: 0,
          },
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
    guestDetails: {
      name: {
        type: String,
      },
      email: {
        type: String,
      },
      mobile: {
        type: String,
      },
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    completionNotes: {
      type: String,
    },
    overdueInfo: {
      extraHours: {
        type: Number,
      },
      extraDays: {
        type: Number,
      },
      overdueCharges: {
        type: Number,
      },
      actualReturnDate: {
        type: Date,
      },
    },
    extensionHistory: [
      {
        previousEndDate: {
          type: Date,
          required: true,
        },
        previousEndTime: {
          type: String,
          required: true,
        },
        newEndDate: {
          type: Date,
          required: true,
        },
        newEndTime: {
          type: String,
          required: true,
        },
        additionalAmount: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
        },
        extendedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        extendedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({
  bookingType: 1,
  bookingStatus: 1,
  start: 1,
  end: 1,
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
