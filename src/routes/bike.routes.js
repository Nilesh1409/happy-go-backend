import express from "express";
import {
  getBikes,
  getBike,
  getAvailableBikes,
  getTrendingBikes,
  createBike,
  updateBike,
  deleteBike,
  addBikeToMaintenance,
  completeBikeMaintenance,
  getBikeMaintenanceHistory,
  updateBikeStatus,
  getBikeBookingHistory,
} from "../controllers/bike.controller.js";
import {
  adminProtect,
  employeeProtect,
} from "../middleware/auth.middleware.js";
import {
  getHelmetInfo,
  updateHelmetSettings,
} from "../controllers/booking.controller.js";

const router = express.Router();

// Public routes
router.get("/", getBikes);
router.get("/trending", getTrendingBikes);
router.get("/available", getAvailableBikes);
router.get("/:id", getBike);

// Admin routes
router.get("/healmets", getHelmetInfo);
router.put("/healmets", updateHelmetSettings);
router.post("/", employeeProtect, createBike);
router.put("/:id", adminProtect, updateBike);
router.delete("/:id", employeeProtect, deleteBike);

// Employee routes
router.post("/:id/maintenance", employeeProtect, addBikeToMaintenance);
router.put("/maintenance/:id", employeeProtect, completeBikeMaintenance);
router.get("/:id/maintenance", employeeProtect, getBikeMaintenanceHistory);
router.put("/:id/status", employeeProtect, updateBikeStatus);
router.get("/:id/bookings", employeeProtect, getBikeBookingHistory);

export default router;
