import express from "express"
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  updateHelmetQuantity,
  clearCart,
} from "../controllers/cart.controller.js"
import { protect } from "../middleware/auth.middleware.js"

const router = express.Router()

// All cart routes require authentication
router.use(protect)

router.get("/", getCart)
router.post("/items", addToCart)
router.put("/items/:itemId", updateCartItem)
router.delete("/items/:itemId", removeFromCart)
router.put("/helmets", updateHelmetQuantity)
router.delete("/", clearCart)

export default router
