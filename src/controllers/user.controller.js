import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

import { uploadToS3Image, getSignedUrl } from "../utils/s3.js";
import { v4 as uuidv4 } from "uuid";

// Update Aadhaar details
export const updateAadhaar = asyncHandler(async (req, res) => {
  const { aadhaarDetails } = req.body;
  const userId = req.user._id;

  // Validate aadhaarDetails
  if (
    !aadhaarDetails ||
    !aadhaarDetails.name ||
    !aadhaarDetails.dob ||
    !aadhaarDetails.gender ||
    !aadhaarDetails.address ||
    !aadhaarDetails.photo_link
  ) {
    throw new Error("Invalid Aadhaar details");
  }

  const aadhaarNumber = aadhaarDetails.ref_id; // Assuming ref_id is the Aadhaar number; adjust as needed
  if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
    throw new Error("Please provide a valid 12-digit Aadhaar number");
  }

  // Mask Aadhaar number
  const maskedNumber = `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;

  // Upload photo to S3
  const photoBuffer = Buffer.from(aadhaarDetails.photo_link, "base64");
  const photoKey = `aadhaar/${userId}/${uuidv4()}.jpg`;
  await uploadToS3Image({
    buffer: photoBuffer,
    fileName: photoKey,
    contentType: "image/jpeg",
  });

  // Update user
  const user = await User.findById(userId);
  user.aadhaar = {
    maskedNumber,
    encryptedNumber: aadhaarNumber,
    name: aadhaarDetails.name,
    dob: aadhaarDetails.dob,
    gender: aadhaarDetails.gender,
    careOf: aadhaarDetails.care_of,
    address: {
      full: aadhaarDetails.address,
      split: aadhaarDetails.split_address,
    },
    yearOfBirth: aadhaarDetails.year_of_birth,
    photoKey,
    shareCode: aadhaarDetails.share_code,
  };
  await user.save();

  res.status(200).json({
    success: true,
    data: { aadhaar: { maskedNumber: user.aadhaar.maskedNumber } },
  });
});

// Upload DL image to S3
export const uploadDLImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new Error("Please upload a DL image");
  }

  const fileExtension = req.file.originalname.split(".").pop();
  const fileKey = `dl/${req.user._id}/${uuidv4()}.${fileExtension}`;

  await uploadToS3Image({
    buffer: req.file.buffer,
    fileName: fileKey,
    contentType: req.file.mimetype,
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { dlImageKey: fileKey },
    { new: true, select: "dlImageKey" }
  );

  res.status(200).json({
    success: true,
    data: { dlImageKey: user.dlImageKey },
  });
});

// Get user profile with pre-signed URLs
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-aadhaar.encryptedNumber"
  );

  if (user.aadhaar && user.aadhaar.photoKey) {
    user.aadhaar.photoUrl = getSignedUrl(user.aadhaar.photoKey);
  }

  if (user.dlImageKey) {
    user.dlImageUrl = getSignedUrl(user.dlImageKey);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

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
