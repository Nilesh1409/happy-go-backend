import express from "express";
import {
  getMe,
  updatePassword,
  getAssignedOrders,
  updateBookingStatus,
  updateOrderStatus,
  getDashboardData,
  getEmployeeBikes,
  getEmployeeBikeById,
  createBike,
  updateBike,
  updateBikeStatus,
  addBikeMaintenance,
  completeBikeMaintenance,
  getBikeMaintenanceHistory,
  getBikeBookingHistory,
  uploadDocument,
  getDocuments,
  deleteDocument,
  updateProfile,
  getEmployeeBookings,
  getEmployeeBookingById,
} from "../controllers/employee.controller.js";

import {
  getHotels,
  getHotelById,
  updateHotel,
  getAllBookings,
  extendBooking,
  checkoutBooking,
  cancelBooking,
} from "../controllers/hotelEmployee.controller.js";

import {
  employeeProtect,
  authorizeEmployee,
} from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Profile routes
router.get("/me", employeeProtect, getMe);
router.put("/update-password", employeeProtect, updatePassword);
router.put("/profile", employeeProtect, updateProfile);

// Dashboard route
router.get("/dashboard", employeeProtect, getDashboardData);

// Bike routes
router.get(
  "/bikes",
  employeeProtect,
  authorizeEmployee("bike"),
  getEmployeeBikes
);
router.get(
  "/bikes/:id",
  employeeProtect,
  authorizeEmployee("bike"),
  getEmployeeBikeById
);
router.post("/bikes", employeeProtect, authorizeEmployee("bike"), createBike);
router.put(
  "/bikes/:id",
  employeeProtect,
  authorizeEmployee("bike"),
  updateBike
);
router.patch(
  "/bikes/:id/status",
  employeeProtect,
  authorizeEmployee("bike"),
  updateBikeStatus
);
router.post(
  "/bikes/:id/maintenance",
  employeeProtect,
  authorizeEmployee("bike"),
  addBikeMaintenance
);
router.patch(
  "/bikes/maintenance/:id/complete",
  employeeProtect,
  authorizeEmployee("bike"),
  completeBikeMaintenance
);
router.get(
  "/bikes/:id/maintenance",
  employeeProtect,
  authorizeEmployee("bike"),
  getBikeMaintenanceHistory
);
router.get(
  "/bikes/:id/bookings",
  employeeProtect,
  authorizeEmployee("bike"),
  getBikeBookingHistory
);

// Booking routes
router.get("/bookings", employeeProtect, getEmployeeBookings);
router.get("/bookings/:id", employeeProtect, getEmployeeBookingById);
router.put("/bookings/:id/status", employeeProtect, updateBookingStatus);

// Order routes
router.get(
  "/orders",
  employeeProtect,
  authorizeEmployee("product"),
  getAssignedOrders
);
router.put(
  "/orders/:id/status",
  employeeProtect,
  authorizeEmployee("product"),
  updateOrderStatus
);

// Document routes
router.post(
  "/upload",
  employeeProtect,
  upload.array("images", 10),
  uploadDocument
);
router.get("/documents", employeeProtect, getDocuments);
router.delete("/documents/:id", employeeProtect, deleteDocument);

/**
 * HOTEL ROUTES (employee access only)
 */
router.get("/hotels", employeeProtect, getHotels);
router.get("/hotels/:id", employeeProtect, getHotelById);
router.put("/hotels/:id", employeeProtect, updateHotel);

/**
 * BOOKING ROUTES (hotel‐type bookings only)
 */
// 1) Get all hotel bookings (or filter by ?hotel=<hotelId>)
router.get("/bookings", employeeProtect, getAllBookings);

// 2) Extend a booking
router.put("/bookings/:id/extend", employeeProtect, extendBooking);

// 3) Checkout a booking
router.put("/bookings/:id/checkout", employeeProtect, checkoutBooking);

// 4) (Optional) Cancel a booking
router.put("/bookings/:id/cancel", employeeProtect, cancelBooking);

export default router;
