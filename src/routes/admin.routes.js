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

export default router

