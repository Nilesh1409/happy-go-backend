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
    throw new ApiError("Invalid Aadhaar details. Please provide name, dob, gender, address, and photo_link", 400);
  }

  const aadhaarNumber = aadhaarDetails.ref_id; // Assuming ref_id is the Aadhaar number; adjust as needed
  if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
    throw new ApiError("Please provide a valid 12-digit Aadhaar number", 400);
  }

  // Check if user already has Aadhaar details
  const existingUser = await User.findById(userId);
  if (existingUser.aadhaar && existingUser.aadhaar.maskedNumber) {
    throw new ApiError("Aadhaar details already exist. Contact support for updates.", 400);
  }

  // Mask Aadhaar number
  const maskedNumber = `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;

  try {
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

    // Generate pre-signed URL for the photo
    const photoUrl = getSignedUrl(photoKey);

    res.status(200).json({
      success: true,
      message: "Aadhaar details updated successfully",
      data: { 
        aadhaar: { 
          maskedNumber: user.aadhaar.maskedNumber,
          name: user.aadhaar.name,
          dob: user.aadhaar.dob,
          gender: user.aadhaar.gender,
          photoUrl: photoUrl
        } 
      },
    });
  } catch (error) {
    console.error("Error updating Aadhaar details:", error);
    throw new ApiError("Failed to update Aadhaar details. Please try again.", 500);
  }
});

// Upload DL image to S3
export const uploadDLImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError("Please upload a driving license image", 400);
  }

  // Validate file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw new ApiError("Please upload a valid image file (JPEG, PNG, WebP)", 400);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    throw new ApiError("File size should not exceed 5MB", 400);
  }

  const fileExtension = req.file.originalname.split(".").pop();
  const fileKey = `dl/${req.user._id}/${uuidv4()}.${fileExtension}`;
  console.log("fileKey");

  try {
    const publicUrl = await uploadToS3Image({
      buffer: req.file.buffer,
      fileName: fileKey,
      contentType: req.file.mimetype,
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { dlImageKey: fileKey, dlImageUrl: publicUrl },
      { new: true, select: "dlImageKey dlImageUrl name email mobile" }
    );

    res.status(200).json({
      success: true,
      message: "Driving license image uploaded successfully",
      data: {
        dlImageKey: user.dlImageKey,
        dlImageUrl: user.dlImageUrl,
        user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile },
      },
    });
  } catch (error) {
    console.error("Error uploading DL image:", error);
    throw new ApiError("Failed to upload driving license image. Please try again.", 500);
  }
});

// Get user profile — dlImageUrl is stored directly in DB (public S3 URL)
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-aadhaar.encryptedNumber -aadhaar.shareCode -aadhaar.tempVerificationId"
  );

  const userObj = user.toObject({ virtuals: true });

  res.status(200).json({
    success: true,
    data: userObj,
  });
});

// Upload Aadhaar image directly (alternative to updateAadhaar)
export const uploadAadhaarImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError("Please upload an Aadhaar image", 400);
  }

  // Validate file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw new ApiError("Please upload a valid image file (JPEG, PNG, WebP)", 400);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    throw new ApiError("File size should not exceed 5MB", 400);
  }

  // Check if user already has Aadhaar photo
  const existingUser = await User.findById(req.user._id);
  if (existingUser.aadhaar && existingUser.aadhaar.photoKey) {
    throw new ApiError("Aadhaar image already exists. Contact support for updates.", 400);
  }

  const fileExtension = req.file.originalname.split(".").pop();
  const photoKey = `aadhaar/${req.user._id}/${uuidv4()}.${fileExtension}`;

  try {
    await uploadToS3Image({
      buffer: req.file.buffer,
      fileName: photoKey,
      contentType: req.file.mimetype,
    });

    // Update user's Aadhaar photoKey
    const user = await User.findById(req.user._id);
    if (!user.aadhaar) {
      user.aadhaar = {};
    }
    user.aadhaar.photoKey = photoKey;
    await user.save();

    // Generate pre-signed URL for immediate access
    const photoUrl = getSignedUrl(photoKey);

    res.status(200).json({
      success: true,
      message: "Aadhaar image uploaded successfully",
      data: { 
        photoKey: photoKey,
        photoUrl: photoUrl,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile
        }
      },
    });
  } catch (error) {
    console.error("Error uploading Aadhaar image:", error);
    throw new ApiError("Failed to upload Aadhaar image. Please try again.", 500);
  }
});

// Get user documents status — dlImageUrl is stored directly (public S3 URL)
export const getDocumentsStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "aadhaar dlImageKey dlImageUrl name email mobile"
  );

  res.status(200).json({
    success: true,
    data: {
      aadhaar: {
        hasDetails: !!(user.aadhaar && user.aadhaar.maskedNumber),
        hasImage: !!(user.aadhaar && user.aadhaar.photoKey),
        maskedNumber: user.aadhaar?.maskedNumber || null,
        name: user.aadhaar?.name || null,
        dob: user.aadhaar?.dob || null,
        gender: user.aadhaar?.gender || null,
      },
      drivingLicense: {
        hasImage: !!user.dlImageKey,
        imageUrl: user.dlImageUrl || null,
      },
      user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile },
    },
  });
});

// Delete driving license image
export const deleteDLImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.dlImageKey) {
    throw new ApiError("No driving license image found to delete", 404);
  }

  try {
    // Update user to remove DL image key
    await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { dlImageKey: 1 } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Driving license image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting DL image:", error);
    throw new ApiError("Failed to delete driving license image. Please try again.", 500);
  }
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
