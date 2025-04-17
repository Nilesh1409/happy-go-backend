import mongoose from "mongoose"

const placeSchema = new mongoose.Schema(
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
    coordinates: {
      latitude: {
        type: Number,
        required: [true, "Please add latitude"],
      },
      longitude: {
        type: Number,
        required: [true, "Please add longitude"],
      },
    },
    images: [
      {
        type: String,
        required: [true, "Please add at least one image"],
      },
    ],
    category: {
      type: String,
      enum: ["Tourist Spot", "Restaurant", "Adventure", "Cultural", "Nature", "Other"],
      required: [true, "Please add a category"],
    },
    recommendedDuration: {
      type: Number, // in hours
      required: [true, "Please add recommended duration"],
    },
    bestTimeToVisit: {
      type: String,
    },
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
  },
)

// Create index for search
placeSchema.index({ name: "text", location: "text", category: "text" })

const Place = mongoose.model("Place", placeSchema)

export default Place

