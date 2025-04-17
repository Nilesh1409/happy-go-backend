import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
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
    images: [
      {
        type: String,
        required: [true, "Please add at least one image"],
      },
    ],
    category: {
      type: String,
      required: [true, "Please add a category"],
      enum: ["Food", "Beverages", "Merchandise", "Accessories", "Other"],
    },
    price: {
      basePrice: {
        type: Number,
        required: [true, "Please add a base price"],
      },
      discountedPrice: {
        type: Number,
      },
    },
    stock: {
      type: Number,
      required: [true, "Please add stock"],
      min: [0, "Stock cannot be negative"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
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
    taxRate: {
      type: Number,
      default: 0.18, // 18% GST
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for product's orders
productSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "products.product",
  justOne: false,
})

// Create index for search
productSchema.index({ title: "text", description: "text", category: "text" })

const Product = mongoose.model("Product", productSchema)

export default Product

