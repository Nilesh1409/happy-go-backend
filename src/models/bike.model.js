import mongoose from "mongoose";

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
      required: false,
    },
    images: [
      {
        type: String,
        required: [true, "Please add at least one image"],
      },
    ],
    // Updated pricing structure with 4 categories
    pricePerDay: {
      weekday: {
        limitedKm: {
          price: {
            type: Number,
            required: [true, "Please add weekday limited km price"],
          },
          kmLimit: {
            type: Number,
            required: [true, "Please add a km limit"],
            default: 60,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
        unlimited: {
          price: {
            type: Number,
            required: [true, "Please add weekday unlimited km price"],
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      },
      weekend: {
        limitedKm: {
          price: {
            type: Number,
            required: [true, "Please add weekend limited km price"],
          },
          kmLimit: {
            type: Number,
            required: [true, "Please add a km limit"],
            default: 60,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
        unlimited: {
          price: {
            type: Number,
            required: [true, "Please add weekend unlimited km price"],
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      },
    },
    // Special date pricing periods
    specialPricing: [
      {
        name: {
          type: String,
          required: true,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        // Replace priceMultiplier with actual pricing structure
        pricing: {
          limitedKm: {
            price: {
              type: Number,
              required: false,
            },
            kmLimit: {
              type: Number,
              default: 60,
            },
            isActive: {
              type: Boolean,
              default: false,
            },
          },
          unlimited: {
            price: {
              type: Number,
              required: false,
            },
            isActive: {
              type: Boolean,
              default: true,
            },
          },
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
      },
    ],
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
      required: false,
      unique: false,
      sparse: true, // Allows multiple documents with null/undefined values
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
    quantity: {
      type: Number,
      required: [true, "Please add quantity"],
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    availableQuantity: {
      type: Number,
      default: function () {
        return this.quantity;
      },
    },
    maintenanceHistory: [
      {
        note: {
          type: String,
          required: true,
        },
        startDate: {
          type: Date,
          default: Date.now,
        },
        endDate: {
          type: Date,
        },
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        status: {
          type: String,
          enum: ["ongoing", "completed"],
          default: "ongoing",
        },
      },
    ],
    status: {
      type: String,
      enum: ["available", "booked", "maintenance", "unavailable"],
      default: "available",
    },
    // Bulk discount settings
    bulkDiscounts: {
      twoOrMore: {
        type: Number,
        default: 2, // 2% discount
        min: 0,
        max: 50,
      },
      threeToFour: {
        type: Number,
        default: 4, // 4% discount
        min: 0,
        max: 50,
      },
      fiveOrMore: {
        type: Number,
        default: 10, // 10% discount
        min: 0,
        max: 50,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for bike's bookings
bikeSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "bike",
  justOne: false,
});

// Create index for search
bikeSchema.index({ title: "text", brand: "text", model: "text" });

// Create sparse unique index for registrationNumber (allows multiple null values)
bikeSchema.index({ registrationNumber: 1 }, { sparse: true, unique: true });

const Bike = mongoose.model("Bike", bikeSchema);

export default Bike;
