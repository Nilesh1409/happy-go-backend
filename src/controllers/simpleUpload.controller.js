import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToS3, processAndUploadImages } from "../utils/s3.js";

// @desc    Simple file upload to S3
// @route   POST /api/simple-upload
// @access  Private
export const simpleUpload = asyncHandler(async (req, res) => {
  console.log("Simple upload request received:", req.files);

  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  try {
    // Process and upload files to S3
    const uploadedUrls = await Promise.all(
      req.files.map(async (file) => {
        // Convert file to base64
        const fileBuffer = file.buffer;
        const base64Data = `data:${file.mimetype};base64,${fileBuffer.toString(
          "base64"
        )}`;

        // Upload to S3
        const s3Url = await uploadToS3(base64Data, "uploads");

        return {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          s3Url,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully to S3",
      data: {
        files: uploadedUrls,
        urls: uploadedUrls.map((file) => file.s3Url),
      },
    });
  } catch (error) {
    console.error("Error uploading files to S3:", error);
    throw new ApiError(error.message || "Failed to upload files to S3", 500);
  }
});

// @desc    Simple file upload to S3 with base64
// @route   POST /api/simple-upload/base64
// @access  Private
export const simpleUploadBase64 = asyncHandler(async (req, res) => {
  const { files, folder = "uploads" } = req.body;

  if (!files || !files.length) {
    throw new ApiError("Please provide at least one file", 400);
  }

  try {
    const uploadedUrls = await processAndUploadImages(files, folder);

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully to S3",
      data: {
        urls: uploadedUrls,
      },
    });
  } catch (error) {
    console.error("Error uploading files to S3:", error);
    throw new ApiError(error.message || "Failed to upload files to S3", 500);
  }
});
