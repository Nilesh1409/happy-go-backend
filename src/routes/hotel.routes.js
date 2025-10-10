import express from "express"
import {
  getHotels,
  getHotel,
  getAvailableHotels,
  createHotel,
  updateHotel,
  deleteHotel,
} from "../controllers/hotel.controller.js"
import {  employeeProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", getHotels)
router.get("/available", getAvailableHotels)
router.get("/:id", getHotel)
router.post("/", employeeProtect, createHotel)
router.put("/:id", employeeProtect, updateHotel)
router.delete("/:id", employeeProtect, deleteHotel)

export default router

