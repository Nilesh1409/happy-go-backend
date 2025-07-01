import User from "../models/user.model.js";
import Referral from "../models/referral.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get referral details
// @route   GET /api/referrals
// @access  Private
export const validateReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.body;

  if (!referralCode || !referralCode.trim()) {
    throw new ApiError("Please provide a referral code", 400);
  }

  const referrer = await User.findOne({
    referralCode: referralCode.trim().toUpperCase(),
  }).select("name referralCode");

  if (!referrer) {
    throw new ApiError("Invalid referral code", 400);
  }

  res.status(200).json({
    success: true,
    data: {
      isValid: true,
      referrer: {
        name: referrer.name,
        referralCode: referrer.referralCode,
      },
      reward: 500, // ₹500 reward
      message: `You'll get ₹500 off on your first booking when referred by ${referrer.name}!`,
    },
  });
});

export const getReferralDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  // Get referrals made by user
  const referrals = await Referral.find({ referrer: req.user._id }).populate({
    path: "referred",
    select: "name",
  });

  // Calculate total rewards
  const totalRewards = referrals.reduce((total, referral) => {
    return referral.isRewarded ? total + referral.reward : total;
  }, 0);

  res.status(200).json({
    success: true,
    data: {
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((r) => r.status === "completed")
        .length,
      pendingReferrals: referrals.filter((r) => r.status === "pending").length,
      totalRewards,
      referrals,
    },
  });
});

// @desc    Apply referral code
// @route   POST /api/referrals/apply
// @access  Private
export const applyReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.body;

  // Validate referral code
  if (!referralCode) {
    throw new ApiError("Please provide a referral code", 400);
  }

  // Check if user has already applied a referral code
  const user = await User.findById(req.user._id);
  if (user.referredBy) {
    throw new ApiError("You have already applied a referral code", 400);
  }

  // Find referrer
  const referrer = await User.findOne({ referralCode });
  if (!referrer) {
    throw new ApiError("Invalid referral code", 400);
  }

  // Check if user is trying to refer themselves
  if (referrer._id.toString() === req.user._id.toString()) {
    throw new ApiError("You cannot refer yourself", 400);
  }

  // Create referral
  const referral = await Referral.create({
    referrer: referrer._id,
    referred: req.user._id,
    referralCode,
    status: "pending",
    reward: 100, // Default reward amount
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Update user
  user.referredBy = referrer._id;
  await user.save();

  res.status(200).json({
    success: true,
    data: referral,
  });
});

// @desc    Complete referral
// @route   PUT /api/referrals/:id/complete
// @access  Private/Admin
export const completeReferral = asyncHandler(async (req, res) => {
  const referral = await Referral.findById(req.params.id);

  if (!referral) {
    throw new ApiError("Referral not found", 404);
  }

  // Check if referral is already completed
  if (referral.status === "completed") {
    throw new ApiError("Referral is already completed", 400);
  }

  // Update referral
  referral.status = "completed";
  referral.completedDate = Date.now();
  referral.isRewarded = true;
  await referral.save();

  // Add reward to referrer's wallet
  const referrer = await User.findById(referral.referrer);
  referrer.walletBalance += referral.reward;
  await referrer.save();

  res.status(200).json({
    success: true,
    data: referral,
  });
});

// @desc    Withdraw referral rewards
// @route   POST /api/referrals/withdraw
// @access  Private
export const withdrawReferralRewards = asyncHandler(async (req, res) => {
  const { upiId, amount } = req.body;

  // Validate required fields
  if (!upiId || !amount) {
    throw new ApiError("Please provide UPI ID and amount", 400);
  }

  // Get user
  const user = await User.findById(req.user._id);

  // Check if user has sufficient balance
  if (user.walletBalance < amount) {
    throw new ApiError("Insufficient wallet balance", 400);
  }

  // Update wallet balance
  user.walletBalance -= amount;
  await user.save();

  // In a real application, you would integrate with a payment gateway to process the withdrawal
  // For now, we'll just return a success message

  res.status(200).json({
    success: true,
    message: `₹${amount} has been successfully withdrawn to UPI ID ${upiId}`,
    data: {
      walletBalance: user.walletBalance,
    },
  });
});
