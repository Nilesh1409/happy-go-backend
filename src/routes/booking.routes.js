import express from "express";
import {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  uploadDocuments,
  calculateAdditionalCharges,
  getHotelBookings,
  getBikeBookings,
  updateHotelBookingDetails,
  getBookingStats,
  extendBikeBooking,
  completeBikeBooking,
  extendBooking,
  cancelBooking,
} from "../controllers/booking.controller.js";
import {
  protect,
  adminProtect,
  employeeProtect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.post("/", protect, createBooking);
router.get("/", protect, getBookings);
router.get("/hotels", protect, getHotelBookings);
router.get("/bikes", protect, getBikeBookings);
router.get("/:id", protect, getBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.put("/:id/documents", protect, uploadDocuments);p
router.put("/:id/hotel-details", protect, updateHotelBookingDetails);

// Employee routes
router.put(
  "/:id/additional-charges",
  employeeProtect,
  calculateAdditionalCharges
);
router.put("/:id/extend/user", protect, extendBikeBooking);
router.put("/:id/extend/employee", employeeProtect, extendBikeBooking);
router.put("/:id/complete", employeeProtect, completeBikeBooking);

// Admin routes
router.get("/stats", adminProtect, getBookingStats);
router.patch("/cancel/:bookingId", employeeProtect, cancelBooking);
router.patch(
  "/extend/:bookingId",
  employeeProtect,
  // authorizeRoles("employee", "admin"),
  extendBooking
);

export default router;
