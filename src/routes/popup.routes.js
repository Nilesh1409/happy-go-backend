import express from "express";
import { upsertPopup, getPopup, deletePopup } from "../controllers/popup.controller.js";
import { adminProtect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public — frontend fetches current popup
router.get("/", getPopup);

// Admin — create or fully replace the popup
router.post(
  "/",
  // adminProtect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  upsertPopup
);

// Admin — delete the popup entirely
// router.delete("/", adminProtect, deletePopup);

export default router;
