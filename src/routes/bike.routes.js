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

const router = express.Router();

// Public routes
router.get("/", getBikes);
router.get("/trending", getTrendingBikes);
router.get("/available", getAvailableBikes);
router.get("/:id", getBike);

// Admin routes
router.post("/", adminProtect, createBike);
router.put("/:id", adminProtect, updateBike);
router.delete("/:id", adminProtect, deleteBike);

// Employee routes
router.post("/:id/maintenance", employeeProtect, addBikeToMaintenance);
router.put("/maintenance/:id", employeeProtect, completeBikeMaintenance);
router.get("/:id/maintenance", employeeProtect, getBikeMaintenanceHistory);
router.put("/:id/status", employeeProtect, updateBikeStatus);
router.get("/:id/bookings", employeeProtect, getBikeBookingHistory);

export default router;
