import express from "express"
import {
  getPlaces,
  getPlace,
  getItinerarySuggestions,
  createPlace,
  updatePlace,
  deletePlace,
} from "../controllers/place.controller.js"
import { protect, adminProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", getPlaces)
router.get("/itinerary", protect, getItinerarySuggestions)
router.get("/:id", getPlace)
router.post("/", adminProtect, createPlace)
router.put("/:id", adminProtect, updatePlace)
router.delete("/:id", adminProtect, deletePlace)

export default router

