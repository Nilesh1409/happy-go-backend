import express from "express";
import {
  uploadFiles,
  uploadToS3Controller,
  deleteUploadedFile,
} from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Upload files using multer middleware
router.post(
  "/files",
  (req, res, next) => {
    console.log("Request headers:", req.headers);
    console.log("Is multipart/form-data:", req.is("multipart/form-data"));
    next();
  },
  protect,
  upload.array("files", 10),
  uploadFiles
);

// Upload base64 images to S3
router.post("/s3", protect, uploadToS3Controller);

// Delete uploaded file
router.delete("/files/:filename", protect, deleteUploadedFile);

export default router;
