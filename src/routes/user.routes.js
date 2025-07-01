import express from "express";
import { upload } from "../middleware/upload.middleware.js";
const router = express.Router();

// Import controllers when implemented
import {
  updateAadhaar,
  updateProfile,
  uploadDLImage,
  getUserProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

router.put("/profile", protect, updateProfile);
router.post("/aadhaar", protect, updateAadhaar);
router.post("/dl-image", protect, upload.single("dlImage"), uploadDLImage);
router.get("/profile", protect, getUserProfile);
// router.post('/reset-password', resetPassword);
// router.put("/profile", protect, updateProfile);

export default router;
