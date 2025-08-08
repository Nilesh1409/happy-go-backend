import express from "express"
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
  addSpecialPricing,
  updateSpecialPricing,
  deleteSpecialPricing,
  getSpecialPricing,
} from "../controllers/bike.controller.js"
import { adminProtect, employeeProtect, employeeOrAdminProtect } from "../middleware/auth.middleware.js"
import { getHelmetInfo, updateHelmetSettings } from "../controllers/booking.controller.js"

const router = express.Router()

// Public routes
router.get("/", getBikes)
router.get("/trending", getTrendingBikes)
router.get("/available", getAvailableBikes)
router.get("/:id", getBike)

// Admin routes
router.get("/helmets", getHelmetInfo)
router.put("/helmets", adminProtect, updateHelmetSettings)
router.post("/", employeeProtect, createBike)
router.put("/:id", employeeOrAdminProtect, updateBike)
router.delete("/:id", employeeProtect, deleteBike)

// Special pricing routes
router.get("/:id/special-pricing", employeeOrAdminProtect, getSpecialPricing)
router.post("/:id/special-pricing", employeeOrAdminProtect, addSpecialPricing)
router.put("/:id/special-pricing/:pricingId", employeeOrAdminProtect, updateSpecialPricing)
router.delete("/:id/special-pricing/:pricingId", employeeOrAdminProtect, deleteSpecialPricing)

// Employee routes
router.post("/:id/maintenance", employeeProtect, addBikeToMaintenance)
router.put("/maintenance/:id", employeeProtect, completeBikeMaintenance)
router.get("/:id/maintenance", employeeProtect, getBikeMaintenanceHistory)
router.put("/:id/status", employeeProtect, updateBikeStatus)
router.get("/:id/bookings", employeeProtect, getBikeBookingHistory)

export default router
