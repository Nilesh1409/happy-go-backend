import express from "express"
import {
  getDashboardData,
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  assignBookingToEmployee,
  assignOrderToEmployee,
  getAdminBookings,
  getAdminOrders,
  getAdminReferrals,
  createSpecialPricePeriod,
  getSpecialPricePeriods,
  updateSpecialPricePeriod,
  deleteSpecialPricePeriod,
} from "../controllers/admin.controller.js"
import { adminProtect } from "../middleware/auth.middleware.js"

const router = express.Router()

router.get("/dashboard", adminProtect, getDashboardData)
router.post("/employees", adminProtect, createEmployee)
router.get("/employees", adminProtect, getEmployees)
router.get("/employees/:id", adminProtect, getEmployee)
router.put("/employees/:id", adminProtect, updateEmployee)
router.delete("/employees/:id", adminProtect, deleteEmployee)
router.put("/bookings/:id/assign", adminProtect, assignBookingToEmployee)
router.put("/orders/:id/assign", adminProtect, assignOrderToEmployee)
router.get("/bookings", adminProtect, getAdminBookings)
router.get("/orders", adminProtect, getAdminOrders)
router.get("/referrals", adminProtect, getAdminReferrals)

// Special Price Period Routes
router.post(
  "/special-price-periods",
  adminProtect,
  createSpecialPricePeriod
)
router.get("/special-price-periods", adminProtect, getSpecialPricePeriods)
router.put(
  "/special-price-periods/:id",
  adminProtect,
  updateSpecialPricePeriod
)
router.delete(
  "/special-price-periods/:id",
  adminProtect,
  deleteSpecialPricePeriod
)

export default router

