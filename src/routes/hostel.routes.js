import express from "express";
import {
  getAvailableHostels,
  getHostel,
  createHostel,
  updateHostel,
  deleteHostel,
  getAdminHostels,
  getAdminHostelBookings,
  getHostelBookingStats,
  getAdminHostelBooking,
} from "../controllers/hostel.controller.js";
import { protect, adminProtect, employeeOrAdminProtect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/available", getAvailableHostels);
router.get("/:id", getHostel);

// Admin/Employee routes - Hostel Management
router.post("/", employeeOrAdminProtect, createHostel);
router.put("/:id", employeeOrAdminProtect, updateHostel);
router.delete("/:id", employeeOrAdminProtect, deleteHostel);
router.get("/admin/all", employeeOrAdminProtect, getAdminHostels);

// Admin/Employee routes - Booking Management
router.get("/admin/bookings/stats", employeeOrAdminProtect, getHostelBookingStats);
router.get("/admin/bookings/:id", employeeOrAdminProtect, getAdminHostelBooking);
router.get("/admin/bookings", employeeOrAdminProtect, getAdminHostelBookings);

export default router;
