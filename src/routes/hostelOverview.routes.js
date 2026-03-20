import express from "express";
import {
  upsertHostelOverview,
  getHostelOverview,
  deleteHostelOverview,
} from "../controllers/hostelOverview.controller.js";
import { adminProtect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public — frontend fetches hostel overview
router.get("/", getHostelOverview);

// Admin — create or fully replace the hostel overview
router.post(
  "/",
  adminProtect,
  upload.fields([{ name: "images", maxCount: 10 }]),
  upsertHostelOverview
);

// Admin — delete the hostel overview entirely
router.delete("/", adminProtect, deleteHostelOverview);

export default router;
