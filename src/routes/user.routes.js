import express from "express";

const router = express.Router();

// Import controllers when implemented
import { updateProfile } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

router.put("/profile", protect, updateProfile);
// router.post('/reset-password', resetPassword);
// router.put("/profile", protect, updateProfile);

export default router;
