import express from "express"
import {
  getHotels,
  getHotel,
  getAvailableHostels,
  createHotel,
  updateHotel,
  deleteHotel,
} from "../controllers/hotel.controller.js"
import {  employeeProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

// Public routes
router.get("/", getHotels)
router.get("/available", getAvailableHostels) // Use hostel function for hotels too
router.get("/:id", getHotel)

// Hostel specific routes
router.get("/hostels/available", getAvailableHostels) // New hostel endpoint

// Admin routes
router.post("/", employeeProtect, createHotel)
router.put("/:id", employeeProtect, updateHotel)
router.delete("/:id", employeeProtect, deleteHotel)

export default router

