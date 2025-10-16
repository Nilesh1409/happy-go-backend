import express from "express"
import {
  getHotels,
  getHotel,
  getAvailableHostels,
  createHotel,
  updateHotel,
  deleteHotel,
} from "../controllers/hotel.controller.js"
import { employeeProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

// Public routes
router.get("/", getHotels) // Get all hostels
router.get("/available", getAvailableHostels) // Get available hostels with filters
router.get("/:id", getHotel) // Get single hostel details

// Admin routes (Employee/Admin only)
router.post("/", employeeProtect, createHotel) // Create new hostel
router.put("/:id", employeeProtect, updateHotel) // Update hostel
router.delete("/:id", employeeProtect, deleteHotel) // Delete hostel

export default router


