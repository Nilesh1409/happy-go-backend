import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToS3Image, getSignedUrl } from "../utils/s3.js";
import HostelOverview from "../models/hostelOverview.model.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Admin creates or replaces the hostel overview (upsert — always one)
// @route   POST /api/hostel-overview
// @access  Private/Admin
export const upsertHostelOverview = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError("title and description are required", 400);
  }

  const existing = await HostelOverview.findOne();

  // Upload new images and replace old ones if provided
  let imageKeys = existing?.imageKeys || [];
  if (req.files?.images?.length > 0) {
    imageKeys = [];
    for (const file of req.files.images) {
      validateImageFile(file);
      const ext = file.originalname.split(".").pop();
      const key = `hostel-overview/${uuidv4()}.${ext}`;
      await uploadToS3Image({
        buffer: file.buffer,
        fileName: key,
        contentType: file.mimetype,
      });
      imageKeys.push(key);
    }
  }

  const overview = await HostelOverview.findOneAndUpdate(
    {},
    { title, description, imageKeys },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    message: "Hostel overview saved successfully",
    data: formatOverview(overview),
  });
});

// @desc    Get the hostel overview (public)
// @route   GET /api/hostel-overview
// @access  Public
export const getHostelOverview = asyncHandler(async (req, res) => {
  const overview = await HostelOverview.findOne();

  if (!overview) {
    return res.status(404).json({
      success: false,
      message: "No hostel overview configured",
    });
  }
  console.log("overview", overview);
  console.log("formatOverview", formatOverview(overview));
  res.status(200).json({
    success: true,
    data: formatOverview(overview),
  });
});

// @desc    Delete the hostel overview entirely
// @route   DELETE /api/hostel-overview
// @access  Private/Admin
export const deleteHostelOverview = asyncHandler(async (req, res) => {
  const overview = await HostelOverview.findOne();

  if (!overview) {
    throw new ApiError("No hostel overview found to delete", 404);
  }

  await HostelOverview.deleteOne({});

  res.status(200).json({
    success: true,
    message: "Hostel overview deleted successfully",
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

const formatOverview = (overview) => {
  const obj = overview.toObject();
  return {
    title: obj.title,
    description: obj.description,
    images: obj.imageKeys || [],
    updatedAt: obj.updatedAt,
    createdAt: obj.createdAt,
  };
};
