import express from "express";
import {
  createBookingPayment,
  createExtendBookingPayment,
  createOrderPayment,
  verifyBookingPayment,
  verifyOrderPayment,
  verifyCartPayment,
} from "../controllers/payment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/booking/:id", protect, createBookingPayment);
router.post("/booking/:id/extend", protect, createExtendBookingPayment);
router.post("/order/:id", protect, createOrderPayment);
router.post("/booking/:id/verify", protect, verifyBookingPayment);
router.post("/order/:id/verify", protect, verifyOrderPayment);
router.post("/cart/verify", protect, verifyCartPayment); // New: Verify cart payment

export default router;
