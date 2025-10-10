import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import Booking from "../models/booking.model.js";
import Order from "../models/order.model.js";
import Bike from "../models/bike.model.js";
import Hotel from "../models/hotel.model.js";
import Product from "../models/product.model.js";
import Referral from "../models/referral.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardData = asyncHandler(async (req, res) => {
  // Get counts
  const totalUsers = await User.countDocuments({ role: "user" });
  const totalEmployees = await Employee.countDocuments();
  const totalBikes = await Bike.countDocuments();
  const totalHotels = await Hotel.countDocuments();
  const totalProducts = await Product.countDocuments();

  // Get bookings
  const bikeBookings = await Booking.countDocuments({ bookingType: "bike" });
  const hotelBookings = await Booking.countDocuments({ bookingType: "hotel" });
  const productOrders = await Order.countDocuments();

  // Get pending actions
  const pendingBikeBookings = await Booking.countDocuments({
    bookingType: "bike",
    bookingStatus: "pending",
    assignedEmployee: { $exists: false },
  });
  const pendingHotelBookings = await Booking.countDocuments({
    bookingType: "hotel",
    bookingStatus: "pending",
    assignedEmployee: { $exists: false },
  });
  const pendingOrders = await Order.countDocuments({
    orderStatus: "pending",
    assignedEmployee: { $exists: false },
  });

  // Get earnings
  const bikeEarnings = await Booking.aggregate([
    { $match: { bookingType: "bike", paymentStatus: "completed" } },
    { $group: { _id: null, total: { $sum: "$priceDetails.totalAmount" } } },
  ]);

  const hotelEarnings = await Booking.aggregate([
    { $match: { bookingType: "hotel", paymentStatus: "completed" } },
    { $group: { _id: null, total: { $sum: "$priceDetails.totalAmount" } } },
  ]);

  const productEarnings = await Order.aggregate([
    { $match: { paymentStatus: "completed" } },
    { $group: { _id: null, total: { $sum: "$priceDetails.totalAmount" } } },
  ]);

  // Get popular items
  const popularBikes = await Booking.aggregate([
    { $match: { bookingType: "bike" } },
    { $group: { _id: "$bike", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "bikes",
        localField: "_id",
        foreignField: "_id",
        as: "bikeDetails",
      },
    },
    { $unwind: "$bikeDetails" },
    {
      $project: {
        _id: 1,
        count: 1,
        title: "$bikeDetails.title",
        brand: "$bikeDetails.brand",
        model: "$bikeDetails.model",
        image: { $arrayElemAt: ["$bikeDetails.images", 0] },
      },
    },
  ]);

  const popularHotels = await Booking.aggregate([
    { $match: { bookingType: "hotel" } },
    { $group: { _id: "$hotel", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "hotels",
        localField: "_id",
        foreignField: "_id",
        as: "hotelDetails",
      },
    },
    { $unwind: "$hotelDetails" },
    {
      $project: {
        _id: 1,
        count: 1,
        name: "$hotelDetails.name",
        location: "$hotelDetails.location",
        image: { $arrayElemAt: ["$hotelDetails.images", 0] },
      },
    },
  ]);

  const popularProducts = await Order.aggregate([
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product",
        count: { $sum: "$products.quantity" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $project: {
        _id: 1,
        count: 1,
        title: "$productDetails.title",
        category: "$productDetails.category",
        image: { $arrayElemAt: ["$productDetails.images", 0] },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      counts: {
        users: totalUsers,
        employees: totalEmployees,
        bikes: totalBikes,
        hotels: totalHotels,
        products: totalProducts,
        bikeBookings,
        hotelBookings,
        productOrders,
      },
      pendingActions: {
        bikeBookings: pendingBikeBookings,
        hotelBookings: pendingHotelBookings,
        orders: pendingOrders,
        total: pendingBikeBookings + pendingHotelBookings + pendingOrders,
      },
      earnings: {
        bikes: bikeEarnings.length > 0 ? bikeEarnings[0].total : 0,
        hotels: hotelEarnings.length > 0 ? hotelEarnings[0].total : 0,
        products: productEarnings.length > 0 ? productEarnings[0].total : 0,
        total:
          (bikeEarnings.length > 0 ? bikeEarnings[0].total : 0) +
          (hotelEarnings.length > 0 ? hotelEarnings[0].total : 0) +
          (productEarnings.length > 0 ? productEarnings[0].total : 0),
      },
      popular: {
        bikes: popularBikes,
        hotels: popularHotels,
        products: popularProducts,
      },
    },
  });
});

// @desc    Create employee
// @route   POST /api/admin/employees
// @access  Private/Admin
export const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    mobile,
    password,
    role,
    assignedModules,
    assignedEntities,
  } = req.body;

  // Validate required fields
  if (
    !name ||
    !email ||
    !mobile ||
    !password ||
    !role ||
    !assignedModules ||
    !assignedModules.length
  ) {
    throw new ApiError("Please provide all required fields", 400);
  }

  // Check if employee already exists
  const employeeExists = await Employee.findOne({
    $or: [{ email }, { mobile }],
  });
  if (employeeExists) {
    throw new ApiError("Employee already exists", 400);
  }

  // Create employee
  const employee = await Employee.create({
    name,
    email,
    mobile,
    password,
    role,
    assignedModules,
    assignedEntities: [], // Empty array as we're giving full section access
    // dummy object id for createdBy
    createdBy: new mongoose.Types.ObjectId(),
  });

  res.status(201).json({
    success: true,
    data: {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      assignedModules: employee.assignedModules,
      assignedEntities: employee.assignedEntities,
    },
  });
});

// @desc    Get all employees
// @route   GET /api/admin/employees
// @access  Private/Admin
export const getEmployees = asyncHandler(async (req, res) => {
  const { role, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = {};

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Count total documents
  const total = await Employee.countDocuments(query);

  // Build sort options
  let sortOptions = {};
  if (sort) {
    const sortFields = sort.split(",");
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1;
      const fieldName = field.startsWith("-") ? field.substring(1) : field;
      sortOptions[fieldName] = sortOrder;
    });
  } else {
    sortOptions = { createdAt: -1 };
  }

  // Pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

  // Execute query
  const employees = await Employee.find(query)
    .select("-password")
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: employees.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: employees,
  });
});

// @desc    Get single employee
// @route   GET /api/admin/employees/:id
// @access  Private/Admin
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select("-password");

  if (!employee) {
    throw new ApiError("Employee not found", 404);
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
});

// @desc    Update employee
// @route   PUT /api/admin/employees/:id
// @access  Private/Admin
export const updateEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    mobile,
    role,
    assignedModules,
    assignedEntities,
    isActive,
  } = req.body;

  let employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError("Employee not found", 404);
  }

  // Update employee
  employee = await Employee.findByIdAndUpdate(
    req.params.id,
    {
      name: name || employee.name,
      email: email || employee.email,
      mobile: mobile || employee.mobile,
      role: role || employee.role,
      assignedModules: assignedModules || employee.assignedModules,
      assignedEntities: assignedEntities || [], // Keep empty for full section access
      isActive: isActive !== undefined ? isActive : employee.isActive,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password");

  res.status(200).json({
    success: true,
    data: employee,
  });
});

// @desc    Delete employee
// @route   DELETE /api/admin/employees/:id
// @access  Private/Admin
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError("Employee not found", 404);
  }

  // Soft delete by setting isActive to false
  employee.isActive = false;
  await employee.save();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Assign booking to employee
// @route   PUT /api/admin/bookings/:id/assign
// @access  Private/Admin
export const assignBookingToEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;

  // Validate required fields
  if (!employeeId) {
    throw new ApiError("Please provide employee ID", 400);
  }

  // Check if booking exists
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new ApiError("Employee not found", 404);
  }

  // Check if employee has access to this module
  if (!employee.assignedModules.includes(booking.bookingType)) {
    throw new ApiError(
      `Employee does not have access to ${booking.bookingType} module`,
      400
    );
  }

  // No need to check assignedEntities - employee has full access to their assigned module

  // Assign booking to employee
  booking.assignedEmployee = employeeId;
  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Assign order to employee
// @route   PUT /api/admin/orders/:id/assign
// @access  Private/Admin
export const assignOrderToEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;

  // Validate required fields
  if (!employeeId) {
    throw new ApiError("Please provide employee ID", 400);
  }

  // Check if order exists
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Check if employee exists
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new ApiError("Employee not found", 404);
  }

  // Check if employee has access to product module
  if (!employee.assignedModules.includes("product")) {
    throw new ApiError("Employee does not have access to product module", 400);
  }

  // No need to check assignedEntities - employee has full access to all products

  // Assign order to employee
  order.assignedEmployee = employeeId;
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Get all bookings for admin
// @route   GET /api/admin/bookings
// @access  Private/Admin
export const getAdminBookings = asyncHandler(async (req, res) => {
  const { type, status, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = {};

  // Filter by type
  if (type) {
    query.bookingType = type;
  }

  // Filter by status
  if (status) {
    query.bookingStatus = status;
  }

  // Count total documents
  const total = await Booking.countDocuments(query);

  // Build sort options
  let sortOptions = {};
  if (sort) {
    const sortFields = sort.split(",");
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1;
      const fieldName = field.startsWith("-") ? field.substring(1) : field;
      sortOptions[fieldName] = sortOrder;
    });
  } else {
    sortOptions = { createdAt: -1 };
  }

  // Pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

  // Execute query
  const bookings = await Booking.find(query)
    .populate({
      path: "bike",
      select: "title brand model images",
    })
    .populate({
      path: "hotel",
      select: "name location images",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .populate({
      path: "assignedEmployee",
      select: "name email mobile",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: bookings,
  });
});

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getAdminOrders = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = {};

  // Filter by status
  if (status) {
    query.orderStatus = status;
  }

  // Count total documents
  const total = await Order.countDocuments(query);

  // Build sort options
  let sortOptions = {};
  if (sort) {
    const sortFields = sort.split(",");
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1;
      const fieldName = field.startsWith("-") ? field.substring(1) : field;
      sortOptions[fieldName] = sortOrder;
    });
  } else {
    sortOptions = { createdAt: -1 };
  }

  // Pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

  // Execute query
  const orders = await Order.find(query)
    .populate({
      path: "products.product",
      select: "title images",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .populate({
      path: "assignedEmployee",
      select: "name email mobile",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: orders,
  });
});

// @desc    Get all referrals for admin
// @route   GET /api/admin/referrals
// @access  Private/Admin
export const getAdminReferrals = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Count total documents
  const total = await Referral.countDocuments(query);

  // Build sort options
  let sortOptions = {};
  if (sort) {
    const sortFields = sort.split(",");
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1;
      const fieldName = field.startsWith("-") ? field.substring(1) : field;
      sortOptions[fieldName] = sortOrder;
    });
  } else {
    sortOptions = { createdAt: -1 };
  }

  // Pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

  // Execute query
  const referrals = await Referral.find(query)
    .populate({
      path: "referrer",
      select: "name email mobile",
    })
    .populate({
      path: "referred",
      select: "name email mobile",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: referrals.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: referrals,
  });
});
