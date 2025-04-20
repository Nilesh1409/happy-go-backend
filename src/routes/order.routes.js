import express from "express";
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrder);
router.put("/:id/status", protect, updateOrderStatus);

export default router;
