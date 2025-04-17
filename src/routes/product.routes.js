import express from "express"
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js"
import { adminProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", getProducts)
router.get("/:id", getProduct)
router.post("/", adminProtect, createProduct)
router.put("/:id", adminProtect, updateProduct)
router.delete("/:id", adminProtect, deleteProduct)

export default router

