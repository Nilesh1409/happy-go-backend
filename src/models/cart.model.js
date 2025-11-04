import mongoose from "mongoose"

// Bike cart item schema
const bikeCartItemSchema = new mongoose.Schema({
  bike: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bike",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
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
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hostel cart item schema
const hostelCartItemSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    required: true,
  },
  roomType: {
    type: String,
    required: true,
  },
  mealOption: {
    type: String,
    enum: ["bedOnly", "bedAndBreakfast", "bedBreakfastAndDinner"],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  pricePerNight: {
    type: Number,
    required: true,
  },
  numberOfNights: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  isWorkstation: {
    type: Boolean,
    default: false,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Bike items
    bikeItems: [bikeCartItemSchema],
    // Hostel items
    hostelItems: [hostelCartItemSchema],
    // Bike booking dates
    bikeDates: {
      startDate: Date,
      endDate: Date,
      startTime: String,
      endTime: String,
    },
    // Hostel booking dates
    hostelDates: {
      checkIn: Date,
      checkOut: Date,
    },
    pricing: {
      bikeSubtotal: {
        type: Number,
        default: 0,
      },
      hostelSubtotal: {
        type: Number,
        default: 0,
      },
      subtotal: {
        type: Number,
        default: 0,
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
      gst: {
        type: Number,
        default: 0,
      },
      gstPercentage: {
        type: Number,
        default: 5,
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    helmetDetails: {
      quantity: {
        type: Number,
        default: 0,
      },
      charges: {
        type: Number,
        default: 0,
      },
      message: {type: String}
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: () => {
        return new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      },
    },
  },
  {
    timestamps: true,
  },
)

// Auto-delete expired carts
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Ensure one active cart per user per time period
cartSchema.index({ user: 1, isActive: 1, startDate: 1, endDate: 1 })

const Cart = mongoose.model("Cart", cartSchema)

export default Cart
