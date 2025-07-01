import axios from "axios";
import asyncHandler from "express-async-handler";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3Image } from "../utils/s3.js";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const CASHFREE_BASE_URL =
  "https://sandbox.cashfree.com/verification/offline-aadhaar";
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

// Generate OTP for Aadhaar verification
const generateAadhaarOtp = asyncHandler(async (req, res) => {
  const { aadhaarNumber } = req.body;
  const userId = req.user._id;

  console.log(
    "🚀 ~ generateAadhaarOtp ~ CASHFREE_CLIENT_ID:",
    CASHFREE_CLIENT_ID,
    CASHFREE_CLIENT_SECRET
  );

  // Validate Aadhaar number
  if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
    res.status(400);
    throw new Error("Please provide a valid 12-digit Aadhaar number");
  }

  try {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/otp`,
      { aadhaar_number: aadhaarNumber },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_CLIENT_ID,
          "x-client-secret": CASHFREE_CLIENT_SECRET,
        },
      }
    );

    const { status, message, ref_id } = response.data;
    console.log("🚀 ~ generateAadhaarOtp ~ status:", status, message);

    if (status !== "SUCCESS") {
      res.status(400);
      throw new Error(message || "Failed to generate OTP");
    }

    // Store ref_id and Aadhaar number temporarily
    const user = await User.findById(userId);
    user.aadhaar = user.aadhaar || {};
    user.aadhaar.tempRefId = ref_id;
    user.aadhaar.encryptedNumber = aadhaarNumber; // Store temporarily for masking later
    await user.save();

    res.status(200).json({
      success: true,
      data: { ref_id, message: "OTP sent successfully" },
    });
  } catch (error) {
    res.status(error.response?.status || 500);
    throw new Error(
      error.response?.data?.message || "Server error during OTP generation"
    );
  }
});

// Verify OTP and update Aadhaar details
const verifyAadhaarOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const userId = req.user._id;

  // Validate OTP
  if (!otp || !/^\d{6}$/.test(otp)) {
    res.status(400);
    throw new Error("Please provide a valid 6-digit OTP");
  }

  const user = await User.findById(userId);
  if (!user.aadhaar?.tempRefId) {
    res.status(400);
    throw new Error("No OTP request found. Please generate OTP first.");
  }

  try {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/verify`,
      {
        otp,
        ref_id: user.aadhaar.tempRefId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_CLIENT_ID,
          "x-client-secret": CASHFREE_CLIENT_SECRET,
        },
      }
    );

    const {
      status,
      message,
      ref_id,
      name,
      dob,
      gender,
      care_of,
      address,
      split_address,
      year_of_birth,
      photo_link,
      share_code,
    } = response.data;

    if (status !== "VALID") {
      res.status(400);
      throw new Error(message || "Aadhaar verification failed");
    }

    // Mask Aadhaar number
    const maskedNumber = `XXXX-XXXX-${
      user.aadhaar.encryptedNumber?.slice(-4) || "XXXX"
    }`;

    // Upload photo to S3
    const photoBuffer = Buffer.from(photo_link, "base64");
    const photoKey = `aadhaar/${userId}/${uuidv4()}.jpg`;
    await uploadToS3Image({
      buffer: photoBuffer,
      fileName: photoKey,
      contentType: "image/jpeg",
    });

    // Update user with verified Aadhaar details
    user.aadhaar = {
      maskedNumber,
      encryptedNumber: user.aadhaar.encryptedNumber,
      name,
      dob,
      gender,
      careOf: care_of,
      address: {
        full: address,
        split: split_address,
      },
      yearOfBirth: year_of_birth,
      photoKey,
      shareCode: share_code,
      tempRefId: null, // Clear temp ref_id
    };

    await user.save();

    res.status(200).json({
      success: true,
      data: { aadhaar: { maskedNumber, name, dob, gender, address } },
    });
  } catch (error) {
    res.status(error.response?.status || 500);
    throw new Error(
      error.response?.data?.message || "Server error during OTP verification"
    );
  }
});

export { generateAadhaarOtp, verifyAadhaarOtp };
