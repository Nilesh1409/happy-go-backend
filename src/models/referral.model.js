import mongoose from "mongoose"

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referred: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referralCode: {
      type: String,
      required: [true, "Please add a referral code"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "expired"],
      default: "pending",
    },
    reward: {
      type: Number,
      required: [true, "Please add a reward amount"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Please add an expiry date"],
    },
    completedDate: {
      type: Date,
    },
    isRewarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

const Referral = mongoose.model("Referral", referralSchema)

export default Referral

