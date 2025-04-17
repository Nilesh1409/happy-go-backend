import mongoose from "mongoose"

const bikeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    brand: {
      type: String,
      required: [true, "Please add a brand"],
    },
    model: {
      type: String,
      required: [true, "Please add a model"],
    },
    year: {
      type: Number,
      required: [true, "Please add a year"],
    },
    images: [
      {
        type: String,
        required: [true, "Please add at least one image"],
      },
    ],
    pricePerDay: {
      limitedKm: {
        price: {
          type: Number,
          required: [true, "Please add a price for limited km"],
        },
        kmLimit: {
          type: Number,
          required: [true, "Please add a km limit"],
          default: 60,
        },
      },
      unlimited: {
        price: {
          type: Number,
          required: [true, "Please add a price for unlimited km"],
        },
      },
    },
    additionalKmPrice: {
      type: Number,
      required: [true, "Please add a price for additional km"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    registrationNumber: {
      type: String,
      required: [true, "Please add a registration number"],
      unique: true,
    },
    location: {
      type: String,
      required: [true, "Please add a location"],
    },
    features: [String],
    requiredDocuments: [
      {
        type: String,
        enum: ["ID Proof", "Driving License", "Address Proof"],
        default: ["ID Proof", "Driving License"],
      },
    ],
    termsAndConditions: [String],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for bike's bookings
bikeSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "bike",
  justOne: false,
})

// Create index for search
bikeSchema.index({ title: "text", brand: "text", model: "text" })

const Bike = mongoose.model("Bike", bikeSchema)

export default Bike

