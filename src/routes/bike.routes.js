import express from "express"
import {
  getBikes,
  getBike,
  getAvailableBikes,
  getTrendingBikes,
  createBike,
  updateBike,
  deleteBike,
} from "../controllers/bike.controller.js"
import { adminProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", getBikes)
router.get("/trending", getTrendingBikes)
router.get("/available", getAvailableBikes)
router.get("/:id", getBike)
router.post("/", adminProtect, createBike)
router.put("/:id", adminProtect, updateBike)
router.delete("/:id", adminProtect, deleteBike)

export default router

