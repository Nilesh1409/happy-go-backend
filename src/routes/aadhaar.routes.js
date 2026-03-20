import express from "express";
import {
  initiateDigilocker,
  getDigilockerStatus,
  completeDigilocker,
} from "../controllers/aadhaar.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Step 1 — Generate DigiLocker consent URL
router.post("/initiate", protect, initiateDigilocker);

// Step 2 — Poll verification status
router.get("/status", protect, getDigilockerStatus);

// Step 3 — Fetch Aadhaar document and save to user (call after AUTHENTICATED)
router.post("/complete", protect, completeDigilocker);

export default router;
