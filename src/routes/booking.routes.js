import express from "express";
import {
  createBooking,
  createCartBooking,
  getBookings,
  getBooking,
  getBookingsByPaymentGroup,
  updateBookingStatus,
  uploadDocuments,
  calculateAdditionalCharges,
  getHostelBookings,
  getBikeBookings,
  updateHostelBookingDetails,
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
router.post("/cart", protect, createCartBooking); // New: Combined cart checkout
router.get("/", protect, getBookings);
router.get("/hostels", protect, getHostelBookings);
router.get("/bikes", protect, getBikeBookings);
router.get("/group/:paymentGroupId", protect, getBookingsByPaymentGroup); // New: Get bookings by payment group
router.get("/:id", protect, getBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.put("/:id/documents", protect, uploadDocuments);
router.put("/:id/hostel-details", protect, updateHostelBookingDetails);

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
