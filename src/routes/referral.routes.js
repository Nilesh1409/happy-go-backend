import express from "express"
import {
  getReferralDetails,
  applyReferralCode,
  completeReferral,
  withdrawReferralRewards,
} from "../controllers/referral.controller.js"
import { protect, adminProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/", protect, getReferralDetails)
router.post("/apply", protect, applyReferralCode)
router.put("/:id/complete", adminProtect, completeReferral)
router.post("/withdraw", protect, withdrawReferralRewards)

export default router

