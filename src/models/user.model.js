import mongoose from "mongoose";
import crypto from "crypto";

// Encryption key (store securely in environment variables)
const ENCRYPTION_KEY =
  process.env.AADHAAR_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const IV_LENGTH = 16; // For AES

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
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
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
    aadhaar: {
      maskedNumber: {
        type: String,
        match: [
          /^XXXX-XXXX-\d{4}$/,
          "Please provide a valid masked Aadhaar number (XXXX-XXXX-1234)",
        ],
      },
      encryptedNumber: {
        type: String,
        select: false,
      },
      name: String,
      dob: String,
      gender: String,
      careOf: String,
      address: {
        full: String,
        split: {
          country: String,
          dist: String,
          house: String,
          landmark: String,
          pincode: Number,
          po: String,
          state: String,
          street: String,
          subdist: String,
          vtc: String,
          locality: String,
        },
      },
      yearOfBirth: Number,
      photoKey: String,
      shareCode: String,
    },
    dlImageKey: String,
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

// Encrypt Aadhaar number before saving
userSchema.pre("save", async function (next) {
  if (
    this.isModified("aadhaar.encryptedNumber") &&
    this.aadhaar.encryptedNumber
  ) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
    let encrypted = cipher.update(this.aadhaar.encryptedNumber);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    this.aadhaar.encryptedNumber =
      iv.toString("hex") + ":" + encrypted.toString("hex");
  }
  next();
});

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  this.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return verificationToken;
};

// Generate mobile verification OTP
userSchema.methods.generateMobileVerificationOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.mobileVerificationOTP = otp;
  this.mobileVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Method to decrypt Aadhaar number (for authorized access)
userSchema.methods.getDecryptedAadhaar = function () {
  if (!this.aadhaar.encryptedNumber) return null;
  const [iv, encryptedText] = this.aadhaar.encryptedNumber.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(Buffer.from(encryptedText, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

const User = mongoose.model("User", userSchema);

export default User;
