import express from "express"
import {
  getHotels,
  getHotel,
  getAvailableHotels,
  createHotel,
  updateHotel,
  deleteHotel,
} from "../controllers/hotel.controller.js"
import { adminProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", getHotels)
router.get("/available", getAvailableHotels)
router.get("/:id", getHotel)
router.post("/", adminProtect, createHotel)
router.put("/:id", adminProtect, updateHotel)
router.delete("/:id", adminProtect, deleteHotel)

export default router

