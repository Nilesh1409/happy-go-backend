import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Please add a room type"],
      trim: true,
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
    // Meal options pricing
    mealOptions: {
      bedOnly: {
        basePrice: {
          type: Number,
          required: [true, "Please add bed only base price"],
        },
        discountedPrice: {
          type: Number,
        },
      },
      bedAndBreakfast: {
        basePrice: {
          type: Number,
          required: [true, "Please add bed and breakfast base price"],
        },
        discountedPrice: {
          type: Number,
        },
      },
      bedBreakfastAndDinner: {
        basePrice: {
          type: Number,
          required: [true, "Please add full board base price"],
        },
        discountedPrice: {
          type: Number,
        },
      },
    },
    amenities: [String], // Locker, Fan, Air conditioner, Ensuite Washroom, etc.
    totalBeds: {
      type: Number,
      required: [true, "Please add total number of beds"],
      min: [1, "Total beds must be at least 1"],
    },
    availableBeds: {
      type: Number,
      required: [true, "Please add available beds"],
      min: [0, "Available beds cannot be negative"],
    },
    // Workstation support
    isWorkstationFriendly: {
      type: Boolean,
      default: false,
    },
    workstationDetails: {
      hasDesk: Boolean,
      hasChair: Boolean,
      hasPowerOutlets: Boolean,
      hasGoodLighting: Boolean,
      quietZone: Boolean,
    },
  },
  {
    _id: true,
  }
);

const hostelSchema = new mongoose.Schema(
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
      default: "Chikkamagaluru",
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
    // Hostel amenities
    amenities: [
      {
        name: {
          type: String,
          required: [true, "Please add an amenity name"],
        },
        icon: {
          type: String,
        },
        description: {
          type: String,
        },
      },
    ],
    rooms: [roomSchema],
    // Hostel policies and guidelines
    guidelines: [String],
    checkInGuidelines: [String],
    cancellationPolicies: [String],
    houseRules: [String],
    ratings: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    checkInTime: {
      type: String,
      default: "1:00 PM",
    },
    checkOutTime: {
      type: String,
      default: "10:00 AM",
    },
    // Contact information
    contactInfo: {
      phone: String,
      email: String,
      whatsapp: String,
    },
    // Workstation availability
    supportsWorkstation: {
      type: Boolean,
      default: false,
    },
    workstationAmenities: [String], // High-speed WiFi, Dedicated workspace, Printing facility, etc.
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for hostel's bookings
hostelSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "hotel",
  justOne: false,
});

// Create index for search
hostelSchema.index({ name: "text", location: "text" });

const Hostel = mongoose.model("Hostel", hostelSchema);

export default Hostel;

