import mongoose from "mongoose"

const bookingItemSchema = new mongoose.Schema({
  bike: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bike",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  kmOption: {
    type: String,
    enum: ["limited", "unlimited"],
    required: true,
  },
  pricePerUnit: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  kmLimit: {
    type: Number,
  },
  additionalKmPrice: {
    type: Number,
    required: true,
  },
  // Individual bike tracking for returns
  bikeUnits: [
    {
      unitNumber: {
        type: Number,
        required: true,
      },
      initialKmReading: {
        type: Number,
      },
      finalKmReading: {
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
      status: {
        type: String,
        enum: ["pending", "picked", "returned"],
        default: "pending",
      },
      returnedAt: {
        type: Date,
      },
    },
  ],
})

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
      enum: ["bike", "hostel"],
    },
    // For bike bookings - supports both single bike and multiple bikes
    bike: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
      required: function () {
        return this.bookingType === "bike" && (!this.bikeItems || this.bikeItems.length === 0)
      },
    },
    bikeItems: [bookingItemSchema],
    // For hostel bookings
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: function () {
        return this.bookingType === "hostel"
      },
    },
    roomType: {
      type: String,
      required: function () {
        return this.bookingType === "hostel"
      },
    },
    // Hostel-specific fields
    mealOption: {
      type: String,
      enum: ["bedOnly", "bedAndBreakfast", "bedBreakfastAndDinner"],
      required: function () {
        return this.bookingType === "hostel"
      },
    },
    numberOfBeds: {
      type: Number,
      required: function () {
        return this.bookingType === "hostel"
      },
      min: [1, "Number of beds must be at least 1"],
    },
    numberOfNights: {
      type: Number,
      required: function () {
        return this.bookingType === "hostel"
      },
      min: [1, "Number of nights must be at least 1"],
    },
    // Common date fields for all booking types
    startDate: {
      type: Date,
      required: [true, "Please add a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please add an end date"],
    },
    // Hostel check-in/check-out dates (aliases for startDate/endDate)
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    startTime: {
      type: String,
      required: function () {
        return this.bookingType === "bike"
      },
    },
    endTime: {
      type: String,
      required: function () {
        return this.bookingType === "bike"
      },
    },
    numberOfPeople: {
      type: Number,
      min: [1, "Number of people must be at least 1"],
    },
    priceDetails: {
      basePrice: {
        type: Number,
        required: true,
      },
      subtotal: {
        type: Number,
        required: true,
      },
      bulkDiscount: {
        amount: {
          type: Number,
          default: 0,
        },
        percentage: {
          type: Number,
          default: 0,
        },
      },
      surgeMultiplier: {
        type: Number,
        default: 1,
      },
      extraCharges: {
        type: Number,
        default: 0,
      },
      extraAmount: {
        type: Number,
        default: 0,
      },
      helmetCharges: {
        type: Number,
        default: 0,
      },
      taxes: {
        type: Number,
        required: [true, "Please add taxes"],
      },
      gstPercentage: {
        type: Number,
        default: 5,
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
      enum: ["pending", "partial", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentId: {
      type: String,
    },
    // Payment group ID for linking multiple bookings in a single transaction
    paymentGroupId: {
      type: String,
      index: true,
    },
    // Partial payment tracking
    paymentDetails: {
      totalAmount: {
        type: Number,
        required: true,
        default: 0,
      },
      paidAmount: {
        type: Number,
        default: 0,
      },
      remainingAmount: {
        type: Number,
        default: 0,
      },
      partialPaymentPercentage: {
        type: Number,
        default: 25, // 25% initial payment
        min: 1,
        max: 100,
      },
      paymentHistory: [
        {
          paymentId: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          paymentType: {
            type: String,
            enum: ["partial", "remaining", "full"],
            required: true,
          },
          razorpayOrderId: {
            type: String,
          },
          razorpayPaymentId: {
            type: String,
          },
          status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
          },
          paidAt: {
            type: Date,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "partial"],
      default: "pending",
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    helmetDetails: {
      quantity: {
        type: Number,
        default: 0,
        min: [0, "Helmet quantity cannot be negative"],
      },
      charges: {
        type: Number,
        default: 0,
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
    // Bike-specific details for single bike bookings
    bikeDetails: {
      kmLimit: {
        type: String,
        enum: ["Limited", "Unlimited"],
      },
      isUnlimited: {
        type: Boolean,
        default: false,
      },
      additionalKmPrice: {
        type: Number,
        default: 0,
      },
      helmetQuantity: {
        type: Number,
        default: 0,
      },
      helmetCharges: {
        type: Number,
        default: 0,
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
    // Hostel details
    hostelDetails: {
      checkInTime: {
        type: String,
      },
      stayType: {
        type: String,
        enum: ["hostel", "workstation"],
        default: "hostel",
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
  },
)

bookingSchema.index({
  bookingType: 1,
  bookingStatus: 1,
  startDate: 1,
  endDate: 1,
})

const Booking = mongoose.model("Booking", bookingSchema)

export default Booking
