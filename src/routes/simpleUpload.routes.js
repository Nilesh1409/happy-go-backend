import express from "express";
import {
  simpleUpload,
  simpleUploadBase64,
} from "../controllers/simpleUpload.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Route for file upload
router.post("/files", upload.array("files", 10), simpleUpload);

// Route for base64 upload
router.post("/base64", protect, simpleUploadBase64);

export default router;
