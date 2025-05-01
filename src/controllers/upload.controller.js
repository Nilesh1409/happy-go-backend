import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { processAndUploadImages } from "../utils/s3.js";
import path from "path";
import fs from "fs";

// @desc    Upload files using multer middleware
// @route   POST /api/upload/files
// @access  Private
export const uploadFiles = asyncHandler(async (req, res) => {
  console.log("Upload files request received:", req.files);

  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  try {
    const uploadedFiles = req.files.map((file) => {
      // Create URL for the uploaded file
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        file.filename
      }`;

      return {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: fileUrl,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        files: uploadedFiles,
        urls: uploadedFiles.map((file) => file.url),
      },
    });
  } catch (error) {
    console.error("Error processing uploaded files:", error);
    throw new ApiError(
      error.message || "Failed to process uploaded files",
      500
    );
  }
});

// @desc    Upload base64 images to S3
// @route   POST /api/upload/s3
// @access  Private
export const uploadToS3Controller = asyncHandler(async (req, res) => {
  console.log("Upload to S3 request received:", req.body);

  const { images, folder = "uploads" } = req.body;

  if (!images || !images.length) {
    throw new ApiError("Please provide at least one image", 400);
  }

  try {
    const uploadedUrls = await processAndUploadImages(images, folder);

    res.status(200).json({
      success: true,
      data: {
        urls: uploadedUrls,
      },
    });
  } catch (error) {
    console.error("Error uploading images to S3:", error);
    throw new ApiError(error.message || "Failed to upload images to S3", 500);
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/upload/files/:filename
// @access  Private
export const deleteUploadedFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    throw new ApiError("Filename is required", 400);
  }

  const filePath = path.join(process.cwd(), "uploads", filename);

  try {
    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Delete file
      fs.unlinkSync(filePath);

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } else {
      throw new ApiError("File not found", 404);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new ApiError(error.message || "Failed to delete file", 500);
  }
});
