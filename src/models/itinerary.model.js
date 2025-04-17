import mongoose from "mongoose"

const dayPlanSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: [true, "Please add a day number"],
      min: [1, "Day must be at least 1"],
    },
    places: [
      {
        place: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Place",
          required: true,
        },
        duration: {
          type: Number, // in hours
          required: [true, "Please add duration"],
        },
        startTime: {
          type: String,
        },
        endTime: {
          type: String,
        },
        notes: {
          type: String,
        },
      },
    ],
  },
  {
    _id: true,
  },
)

const itinerarySchema = new mongoose.Schema(
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
    location: {
      type: String,
      required: [true, "Please add a location"],
    },
    duration: {
      type: Number, // in days
      required: [true, "Please add duration"],
      min: [1, "Duration must be at least 1 day"],
    },
    dayPlans: [dayPlanSchema],
    totalDistance: {
      type: Number, // in km
    },
    recommendedTransport: {
      type: String,
    },
    estimatedBudget: {
      type: Number,
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

const Itinerary = mongoose.model("Itinerary", itinerarySchema)

export default Itinerary

