import express from "express";
import {
  registerUser,
  verifyEmail,
  sendMobileOTP,
  verifyMobileOTP,
  loginUser,
  getMe,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/send-mobile-otp", sendMobileOTP);
router.post("/verify-mobile-otp", verifyMobileOTP);
router.post("/login", loginUser);
router.get("/me", protect, getMe);

export default router;
