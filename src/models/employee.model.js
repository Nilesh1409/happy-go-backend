import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    mobile: {
      type: String,
      required: [true, "Please add a mobile number"],
      unique: true,
      match: [/^[0-9]{10}$/, "Please add a valid 10-digit mobile number"],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["bike", "hotel", "product"],
      required: [true, "Please specify employee role"],
    },
    assignedModules: {
      type: [String],
      enum: ["bike", "hotel", "product"],
      required: [true, "Please assign at least one module"],
    },
    assignedEntities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "role",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Added fields for OTP-based authentication
    mobileVerificationOTP: {
      type: String,
    },
    mobileVerificationExpire: {
      type: Date,
    },
    // Added fields for employee profile
    profileImage: {
      type: String,
    },
    address: {
      type: String,
    },
    emergencyContact: {
      type: String,
    },
    bio: {
      type: String,
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match employee entered password to hashed password in database
employeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
