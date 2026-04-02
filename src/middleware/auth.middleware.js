import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Log basic request details: Timestamp, HTTP method, endpoint, and IP address
  const requestTime = new Date();
  console.log(`API Request received at: ${requestTime.toISOString()}`);
  console.log(`Request Type: ${req.method}`);
  console.log(`Endpoint: ${req.originalUrl}`);
  console.log(`Authorization: ${req.headers.authorization ? "Present" : "Missing"}`);

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ApiError("Not authorized to access this route", 401));
  }

  try {
    console.log("JWT_SECRET is:", !!process.env.JWT_SECRET);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🚀 ~ protect ~ decoded:", decoded);

    // First check if it's a user
    const user = await User.findById(decoded.id).select("-password");
    console.log("🚀 ~ protect ~ user:", user);

    if (user) {
      // Add user to request
      req.user = user;
      return next();
    }

    // If not a user, check if it's an employee
    const employee = await Employee.findById(decoded.id).select("-password");

    if (employee) {
      // Add employee to request
      req.employee = employee;
      return next();
    }

    // If neither user nor employee found - this means the JWT token is valid but the user/employee was deleted
    console.error(`Authentication failed: User/Employee with ID ${decoded.id} not found in database. The account may have been deleted.`);
    return next(new ApiError("Account not found. Your account may have been deleted. Please contact support or register again.", 404));
  } catch (error) {
    console.error("Token verification error:", error.message);
    return next(new ApiError("Authentication failed", 401));
  }
});

export const adminProtect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ApiError("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if admin exists
    const admin = await User.findById(decoded.id).select("-password");
    if (!admin || admin.role !== "admin") {
      return next(new ApiError("Not authorized as admin", 403));
    }

    // Add admin to request
    req.user = admin;
    next();
  } catch (error) {
    return next(new ApiError("Not authorized to access this route", 401));
  }
});

export const employeeProtect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ApiError("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if employee exists
    const employee = await Employee.findById(decoded.id).select("-password");
    if (!employee) {
      return next(new ApiError("Employee not found", 404));
    }

    // Add employee to request
    req.employee = employee;
    next();
  } catch (error) {
    return next(new ApiError("Not authorized to access this route", 401));
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

export const employeeOrAdminProtect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ApiError("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // First check if it's an admin
    const admin = await User.findById(decoded.id).select("-password");
    if (admin && admin.role === "admin") {
      req.user = admin;
      req.userType = "admin";
      return next();
    }

    // If not admin, check if it's an employee
    const employee = await Employee.findById(decoded.id).select("-password");
    if (employee) {
      req.employee = employee;
      req.userType = "employee";
      return next();
    }

    return next(new ApiError("Not authorized - must be employee or admin", 403));
  } catch (error) {
    return next(new ApiError("Not authorized to access this route", 401));
  }
});

export const authorizeEmployee = (moduleType) => {
  return asyncHandler(async (req, res, next) => {
    // Check if employee has access to this module
    if (!req.employee.assignedModules.includes(moduleType)) {
      return next(
        new ApiError(
          `Employee is not authorized to access ${moduleType} module`,
          403
        )
      );
    }
    // No need to check assignedEntities - employee has full access to their assigned modules
    next();
  });
};
