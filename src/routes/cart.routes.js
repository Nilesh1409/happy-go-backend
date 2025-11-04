import express from "express"
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  updateHelmetQuantity,
  clearCart,
  addHostelToCart,
  getCartDetails,
  removeHostelFromCart,
} from "../controllers/cart.controller.js"
import { protect } from "../middleware/auth.middleware.js"

const router = express.Router()

// All cart routes require authentication
router.use(protect)

// Get complete cart details (bikes + hostels)
router.get("/details", getCartDetails)

// Bike cart routes
router.get("/", getCart)
router.post("/items", addToCart)
router.put("/items/:itemId", updateCartItem)
router.delete("/items/:itemId", removeFromCart)
router.put("/helmets", updateHelmetQuantity)

// Hostel cart routes
router.post("/hostels", addHostelToCart)
router.delete("/hostels/:itemId", removeHostelFromCart)

// Clear cart
router.delete("/", clearCart)

export default router
