import express from "express";
import {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  uploadDocuments,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/", protect, getBookings);
router.get("/:id", protect, getBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.put("/:id/documents", protect, uploadDocuments);

export default router;
