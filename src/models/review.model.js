import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entityType: {
      type: String,
      enum: ["bike", "hotel", "product", "place"],
      required: [true, "Please add an entity type"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "entityType",
      required: [true, "Please add an entity ID"],
    },
    rating: {
      type: Number,
      required: [true, "Please add a rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },
    comment: {
      type: String,
      required: [true, "Please add a comment"],
      maxlength: [500, "Comment cannot be more than 500 characters"],
    },
    images: [String],
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent user from submitting more than one review per entity
reviewSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true })

const Review = mongoose.model("Review", reviewSchema)

export default Review

