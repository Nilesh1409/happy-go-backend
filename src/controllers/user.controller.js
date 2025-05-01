import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, profileImage } = req.body;

  // Find user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Update user fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (profileImage !== undefined) user.profileImage = profileImage;

  // Save user
  await user.save();

  // Return updated user
  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
      isEmailVerified: user.isEmailVerified,
      isMobileVerified: user.isMobileVerified,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
      role: user.role,
    },
    message: "Profile updated successfully",
  });
});
