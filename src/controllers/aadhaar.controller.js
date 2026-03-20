import axios from "axios";
import asyncHandler from "express-async-handler";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3Image } from "../utils/s3.js";
import User from "../models/user.model.js";

const BASE_URL = "https://sandbox.cashfree.com/verification";
// Switch to "https://api.cashfree.com/verification" for production

const cfHeaders = () => ({
  "Content-Type": "application/json",
  "x-client-id": process.env.CASHFREE_CLIENT_ID,
  "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Initiate DigiLocker verification
// POST /api/verification/aadhaar/initiate
// Body (optional): { redirect_url, user_flow }
// ─────────────────────────────────────────────────────────────────────────────
export const initiateDigilocker = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // redirect_url is where DigiLocker sends the user after consent.
  // Mobile: pass a deep-link e.g. "happygo://aadhaar-verified"
  // Web: leave empty → defaults to FRONTEND_URL/aadhaar-verified
  const redirectUrl =
    req.body.redirect_url ||
    "https://happygorentals.com/aadhaar-verified";

  // user_flow: "signin" if user already has DigiLocker account, "signup" otherwise
  const userFlow = req.body.user_flow || "signup";

  // Unique ID per verification attempt — stored on user to poll later
  const verificationId = `aadhaar_${userId}_${Date.now()}`;

  const { data } = await axios.post(
    `${BASE_URL}/digilocker`,
    {
      verification_id: verificationId,
      document_requested: ["AADHAAR"],
      redirect_url: redirectUrl,
      user_flow: userFlow,
    },
    { headers: cfHeaders() }
  );

  // Persist verification_id on the user so we can poll without re-sending it
  await User.findByIdAndUpdate(userId, {
    "aadhaar.tempVerificationId": verificationId,
  });

  res.status(200).json({
    success: true,
    data: {
      verification_id: data.verification_id,
      reference_id: data.reference_id,
      digilocker_url: data.url,   // Open this URL in WebView / browser
      status: data.status,        // "PENDING"
      expires_in: "10 minutes",
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Poll verification status
// GET /api/verification/aadhaar/status
// Query (optional): ?verification_id=xxx  (falls back to user's stored one)
// ─────────────────────────────────────────────────────────────────────────────
export const getDigilockerStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let verificationId = req.query.verification_id;

  if (!verificationId) {
    const user = await User.findById(userId).select("aadhaar.tempVerificationId");
    verificationId = user?.aadhaar?.tempVerificationId;
  }

  if (!verificationId) {
    res.status(400);
    throw new Error("No active verification found. Please initiate first.");
  }

  const { data } = await axios.get(`${BASE_URL}/digilocker`, {
    params: { verification_id: verificationId },
    headers: cfHeaders(),
  });

  res.status(200).json({
    success: true,
    data: {
      status: data.status,             // PENDING | AUTHENTICATED | EXPIRED | CONSENT_DENIED
      verification_id: data.verification_id,
      reference_id: data.reference_id,
      user_details: data.user_details, // name, dob, gender, mobile (basic info)
      document_consent: data.document_consent,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Fetch Aadhaar document & save to user
// POST /api/verification/aadhaar/complete
// Body (optional): { verification_id }  (falls back to user's stored one)
// Call this only after status is "AUTHENTICATED"
// ─────────────────────────────────────────────────────────────────────────────
export const completeDigilocker = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let verificationId = req.body.verification_id;

  const user = await User.findById(userId);
  if (!verificationId) {
    verificationId = user?.aadhaar?.tempVerificationId;
  }

  if (!verificationId) {
    res.status(400);
    throw new Error("No active verification found. Please initiate first.");
  }

  // Fetch the Aadhaar document from Cashfree
  const { data } = await axios.get(
    `${BASE_URL}/digilocker/document/AADHAAR`,
    {
      params: { verification_id: verificationId },
      headers: cfHeaders(),
    }
  );

  if (data.status !== "SUCCESS") {
    res.status(400);
    throw new Error(
      data.status === "AADHAAR_NOT_LINKED"
        ? "Aadhaar is not linked to DigiLocker. Please link it and retry."
        : `Aadhaar fetch failed: ${data.status}`
    );
  }

  const {
    uid,           // masked Aadhaar UID e.g. "xxxxxxxx5647"
    name,
    dob,
    gender,
    care_of,
    split_address,
    year_of_birth,
    photo_link,
    share_code,
  } = data;

  // Mask UID into XXXX-XXXX-XXXX format using last 4 digits
  const last4 = uid ? uid.replace(/\D/g, "").slice(-4) : "XXXX";
  const maskedNumber = `XXXX-XXXX-${last4}`;

  // Upload photo to S3 (photo_link is base64)
  let photoKey = null;
  if (photo_link) {
    photoKey = `aadhaar/${userId}/${uuidv4()}.jpg`;
    await uploadToS3Image({
      buffer: Buffer.from(photo_link, "base64"),
      fileName: photoKey,
      contentType: "image/jpeg",
    });
  }

  // Save to user — clear tempVerificationId once done
  user.aadhaar = {
    maskedNumber,
    encryptedNumber: user.aadhaar?.encryptedNumber || null,
    name,
    dob,
    gender,
    careOf: care_of,
    address: {
      full: [
        split_address?.house,
        split_address?.street,
        split_address?.vtc,
        split_address?.dist,
        split_address?.state,
        split_address?.pincode,
      ]
        .filter(Boolean)
        .join(", "),
      split: split_address,
    },
    yearOfBirth: year_of_birth,
    photoKey,
    shareCode: share_code || null,
    tempVerificationId: null, // clear once completed
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: "Aadhaar verified successfully via DigiLocker",
    data: {
      maskedNumber,
      name,
      dob,
      gender,
      address: user.aadhaar.address,
    },
  });
});
