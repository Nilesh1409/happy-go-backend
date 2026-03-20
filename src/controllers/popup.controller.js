import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToS3Image, getSignedUrl } from "../utils/s3.js";
import Popup from "../models/popup.model.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Admin creates or replaces the popup (upsert — always one popup)
// @route   POST /api/popup
// @access  Private/Admin
export const upsertPopup = asyncHandler(async (req, res) => {
  const { title, description, show } = req.body;

  if (!title || !description) {
    throw new ApiError("title and description are required", 400);
  }

  if (show && !["always", "once"].includes(show)) {
    throw new ApiError("show must be 'always' or 'once'", 400);
  }

  const existing = await Popup.findOne();

  // Handle popup image upload
  let imageKey = existing?.imageKey || null;
  if (req.files?.image?.[0]) {
    const file = req.files.image[0];
    validateImageFile(file);
    const ext = file.originalname.split(".").pop();
    const newKey = `popups/main/${uuidv4()}.${ext}`;
    await uploadToS3Image({
      buffer: file.buffer,
      fileName: newKey,
      contentType: file.mimetype,
    });
    imageKey = newKey;
  }

  const popup = await Popup.findOneAndUpdate(
    {},
    { title, description, show: show || "always", imageKey },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    message: "Popup saved successfully",
    data: formatPopup(popup),
  });
});

// @desc    Get the current popup (public)
// @route   GET /api/popup
// @access  Public
export const getPopup = asyncHandler(async (req, res) => {
  const popup = await Popup.findOne();

  if (!popup) {
    return res.status(404).json({
      success: false,
      message: "No popup configured",
    });
  }

  res.status(200).json({
    success: true,
    data: formatPopup(popup),
  });
});

// @desc    Delete the popup entirely
// @route   DELETE /api/popup
// @access  Private/Admin
export const deletePopup = asyncHandler(async (req, res) => {
  const popup = await Popup.findOne();

  if (!popup) {
    throw new ApiError("No popup found to delete", 404);
  }

  await Popup.deleteOne({});

  res.status(200).json({
    success: true,
    message: "Popup deleted successfully",
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const validateImageFile = (file) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    throw new ApiError("Only JPEG, PNG, and WebP images are allowed", 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError("Image size must not exceed 5MB", 400);
  }
};

const formatPopup = (popup) => {
  const obj = popup.toObject();
  return {
    title: obj.title,
    description: obj.description,
    show: obj.show,
    imageUrl: obj.imageKey ? getSignedUrl(obj.imageKey) : null,
    updatedAt: obj.updatedAt,
    createdAt: obj.createdAt,
  };
};
