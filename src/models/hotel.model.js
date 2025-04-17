import mongoose from "mongoose"

const roomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Please add a room type"],
      enum: [
        "Single Bed",
        "Double Bed",
        "Mixed A/C Dormitory",
        "Deluxe Double A/C Room with Ensuite Bathroom",
        "Bed in 6 Bed Mixed A/C Dormitory Room with Ensuite Bathroom",
      ],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    images: [
      {
        type: String,
        required: [true, "Please add at least one image"],
      },
    ],
    capacity: {
      type: Number,
      required: [true, "Please add capacity"],
      min: [1, "Capacity must be at least 1"],
    },
    priceOptions: {
      bedOnly: {
        basePrice: {
          type: Number,
          required: [true, "Please add a base price"],
        },
        discountedPrice: {
          type: Number,
        },
      },
      bedAndBreakfast: {
        basePrice: {
          type: Number,
          required: [true, "Please add a base price"],
        },
        discountedPrice: {
          type: Number,
        },
      },
      bedBreakfastAndDinner: {
        basePrice: {
          type: Number,
          required: [true, "Please add a base price"],
        },
        discountedPrice: {
          type: Number,
        },
      },
    },
    amenities: [String],
    totalRooms: {
      type: Number,
      required: [true, "Please add total number of rooms"],
      min: [1, "Total rooms must be at least 1"],
    },
    availableRooms: {
      type: Number,
      required: [true, "Please add available rooms"],
      min: [0, "Available rooms cannot be negative"],
    },
  },
  {
    _id: true,
  },
)

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    location: {
      type: String,
      required: [true, "Please add a location"],
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
    },
    images: [
      {
        type: String,
        required: [true, "Please add at least one image"],
      },
    ],
    amenities: [
      {
        name: {
          type: String,
          required: [true, "Please add an amenity name"],
        },
        icon: {
          type: String,
        },
      },
    ],
    rooms: [roomSchema],
    guidelines: [String],
    checkInGuidelines: [String],
    cancellationPolicies: [String],
    ratings: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
      default: 4,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for hotel's bookings
hotelSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "hotel",
  justOne: false,
})

// Create index for search
hotelSchema.index({ name: "text", location: "text" })

const Hotel = mongoose.model("Hotel", hotelSchema)

export default Hotel

