import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: ["user", "admin", "employee"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    mobileVerificationOTP: String,
    mobileVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for user's bookings
userSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

// Generate referral code
userSchema.pre("save", async function (next) {
  if (!this.referralCode) {
    // Generate a unique referral code
    const randomString = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.referralCode = `${this.name
      .substring(0, 2)
      .toUpperCase()}${randomString}`;
  }
  next();
});

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire
  this.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return verificationToken;
};

// Generate mobile verification OTP
userSchema.methods.generateMobileVerificationOTP = function () {
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set OTP and expire
  this.mobileVerificationOTP = otp;
  this.mobileVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return otp;
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const User = mongoose.model("User", userSchema);

export default User;
