import express from "express";

const router = express.Router();
import {
  generateAadhaarOtp,
  verifyAadhaarOtp,
} from "../controllers/aadhaar.controller.js";
import { protect } from "../middleware/auth.middleware.js";

router.post("/generate-otp", protect, generateAadhaarOtp);
router.post("/verify", protect, verifyAadhaarOtp);

export default router;
