import express from "express";
import { upload } from "../middleware/upload.middleware.js";
const router = express.Router();

// Import controllers when implemented
import {
  updateAadhaar,
  updateProfile,
  uploadDLImage,
  getUserProfile,
  uploadAadhaarImage,
  getDocumentsStatus,
  deleteDLImage,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

// Profile routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateProfile);

// Document routes
router.get("/documents/status", protect, getDocumentsStatus);

// Aadhaar routes
router.post("/aadhaar", protect, updateAadhaar);
router.post("/aadhaar/image", protect, upload.single("aadhaarImage"), uploadAadhaarImage);

// Driving License routes
router.post("/dl-image", protect, upload.single("dlImage"), uploadDLImage);
router.delete("/dl-image", protect, deleteDLImage);

export default router;
