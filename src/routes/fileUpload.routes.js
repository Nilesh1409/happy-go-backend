import express from "express";
import multer from "multer";
import {
  uploadFiles,
  uploadBase64Files,
  deleteFile,
  getUploadConfig,
} from "../controllers/fileUpload.controller.js";
import { employeeProtect, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Configure multer with memory storage for direct S3 upload
const storage = multer.memoryStorage();

// Enhanced file filter with better error messages
const fileFilter = (req, file, cb) => {
  console.log("Processing file:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Allowed file types
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // Videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Unsupported file type: ${
        file.mimetype
      }. Allowed types: ${allowedTypes.join(", ")}`
    );
    error.code = "UNSUPPORTED_FILE_TYPE";
    cb(error, false);
  }
};

// Configure multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10, // Maximum 10 files per request
  },
});

// Middleware to handle multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum file size is 100MB.",
        error: "FILE_TOO_LARGE",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 10 files allowed per request.",
        error: "TOO_MANY_FILES",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "files" as the field name.',
        error: "UNEXPECTED_FIELD",
      });
    }
  }

  if (error.code === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: "UNSUPPORTED_FILE_TYPE",
    });
  }

  // Pass other errors to the default error handler
  next(error);
};

// Request logging middleware
const logRequest = (req, res, next) => {
  console.log(`File upload request: ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    userAgent: req.get("User-Agent"),
    contentType: req.get("Content-Type"),
    contentLength: req.get("Content-Length"),
  });
  next();
};

// Routes

// Get upload configuration (public endpoint)
router.get("/config", getUploadConfig);

// Upload multiple files (multipart/form-data)
router.post(
  "/files",
  logRequest,
  // employeeProtect,
  upload.array("files", 10),
  handleMulterError,
  uploadFiles
);

// Upload base64 files (application/json)
router.post("/base64", logRequest, protect, uploadBase64Files);

// Delete file from S3
router.delete("/", protect, deleteFile);

export default router;
