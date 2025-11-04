import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import Booking from "../models/booking.model.js";
import Order from "../models/order.model.js";
import Bike from "../models/bike.model.js";
import Hostel from "../models/hostel.model.js";
import Product from "../models/product.model.js";
import Referral from "../models/referral.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../utils/sendEmail.js";
import mongoose from "mongoose";

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardData = asyncHandler(async (req, res) => {
  // Get counts
  const totalUsers = await User.countDocuments({ role: "user" });
  const totalEmployees = await Employee.countDocuments();
  const totalBikes = await Bike.countDocuments();
  const totalHostels = await Hostel.countDocuments();
  const totalProducts = await Product.countDocuments();

  // Get bookings
  const bikeBookings = await Booking.countDocuments({ bookingType: "bike" });
  const hostelBookings = await Booking.countDocuments({ bookingType: "hostel" });
  const productOrders = await Order.countDocuments();

  // Get pending actions
  const pendingBikeBookings = await Booking.countDocuments({
    bookingType: "bike",
    bookingStatus: "pending",
    assignedEmployee: { $exists: false },
  });
  const pendingHostelBookings = await Booking.countDocuments({
    bookingType: "hostel",
    bookingStatus: "pending",
    assignedEmployee: { $exists: false },
  });
  const pendingOrders = await Order.countDocuments({
    orderStatus: "pending",
    assignedEmployee: { $exists: false },
  });

  // Get earnings (including partial payments)
  const bikeEarnings = await Booking.aggregate([
    { 
      $match: { 
        bookingType: "bike", 
        paymentStatus: { $in: ["partial", "completed"] } 
      } 
    },
    { 
      $group: { 
        _id: null, 
        total: { $sum: "$paymentDetails.paidAmount" } 
      } 
    },
  ]);

  const hostelEarnings = await Booking.aggregate([
    { 
      $match: { 
        bookingType: "hostel", 
        paymentStatus: { $in: ["partial", "completed"] } 
      } 
    },
    { 
      $group: { 
        _id: null, 
        total: { $sum: "$paymentDetails.paidAmount" } 
      } 
    },
  ]);

  const productEarnings = await Order.aggregate([
    { $match: { paymentStatus: "completed" } },
    { $group: { _id: null, total: { $sum: "$priceDetails.totalAmount" } } },
  ]);

  // Get payment status breakdown for bookings
  const paymentStatusBreakdown = await Booking.aggregate([
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$priceDetails.totalAmount" },
        paidAmount: { $sum: "$paymentDetails.paidAmount" },
        remainingAmount: { $sum: "$paymentDetails.remainingAmount" },
      }
    }
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

  const popularHostels = await Booking.aggregate([
    { $match: { bookingType: "hostel" } },
    { $group: { _id: "$hostel", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "hostels",
        localField: "_id",
        foreignField: "_id",
        as: "hostelDetails",
      },
    },
    { $unwind: "$hostelDetails" },
    {
      $project: {
        _id: 1,
        count: 1,
        name: "$hostelDetails.name",
        location: "$hostelDetails.location",
        image: { $arrayElemAt: ["$hostelDetails.images", 0] },
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

  // Format payment status breakdown
  const formattedPaymentBreakdown = paymentStatusBreakdown.reduce((acc, item) => {
    acc[item._id] = {
      count: item.count,
      totalAmount: item.totalAmount || 0,
      paidAmount: item.paidAmount || 0,
      remainingAmount: item.remainingAmount || 0,
    };
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      counts: {
        users: totalUsers,
        employees: totalEmployees,
        bikes: totalBikes,
        hostels: totalHostels,
        products: totalProducts,
        bikeBookings,
        hostelBookings,
        productOrders,
      },
      pendingActions: {
        bikeBookings: pendingBikeBookings,
        hostelBookings: pendingHostelBookings,
        orders: pendingOrders,
        total: pendingBikeBookings + pendingHostelBookings + pendingOrders,
      },
      earnings: {
        bikes: bikeEarnings.length > 0 ? bikeEarnings[0].total : 0,
        hostels: hostelEarnings.length > 0 ? hostelEarnings[0].total : 0,
        products: productEarnings.length > 0 ? productEarnings[0].total : 0,
        total:
          (bikeEarnings.length > 0 ? bikeEarnings[0].total : 0) +
          (hostelEarnings.length > 0 ? hostelEarnings[0].total : 0) +
          (productEarnings.length > 0 ? productEarnings[0].total : 0),
      },
      paymentStatus: formattedPaymentBreakdown,
      popular: {
        bikes: popularBikes,
        hostels: popularHostels,
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
      path: "bikeItems.bike",
      select: "title brand model images",
    })
    .populate({
      path: "hostel",
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

// @desc    Mark remaining payment as completed (for offline/manual payments)
// @route   PUT /api/admin/bookings/:id/complete-payment
// @access  Private/Admin/Employee
export const markPaymentCompleted = asyncHandler(async (req, res) => {
  const { paymentMethod, paymentReference, notes } = req.body;

  // Get booking
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'name email mobile')
    .populate('bike', 'title')
    .populate('hostel', 'name');

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if payment is already completed
  if (booking.paymentStatus === "completed") {
    throw new ApiError("Payment already completed for this booking", 400);
  }

  // Check if there's remaining amount to pay
  if (booking.paymentDetails.remainingAmount <= 0) {
    throw new ApiError("No remaining amount to pay", 400);
  }

  // Calculate the amount being marked as paid
  const remainingAmount = booking.paymentDetails.remainingAmount;
  const isPartialPayment = booking.paymentStatus === "partial";

  // Update payment details
  booking.paymentDetails.paidAmount += remainingAmount;
  booking.paymentDetails.remainingAmount = 0;
  booking.paymentStatus = "completed";
  booking.bookingStatus = "confirmed";

  // Add to payment history
  booking.paymentDetails.paymentHistory.push({
    paymentId: `MANUAL_${Date.now()}`,
    amount: remainingAmount,
    paymentType: isPartialPayment ? "remaining" : "full",
    status: "completed",
    paidAt: new Date(),
    createdAt: new Date(),
    paymentMethod: paymentMethod || "offline",
    paymentReference: paymentReference || "",
    notes: notes || "Payment marked as completed by admin/employee",
    markedBy: req.user?._id || req.employee?._id
  });

  await booking.save();

  // Send confirmation email to user
  try {
    const emailSubject = isPartialPayment 
      ? "✅ Remaining Payment Confirmed - Happy Go"
      : "✅ Payment Confirmed - Happy Go";
      
    const emailContent = `
      <h1>Payment Confirmed</h1>
      <p>Dear ${booking.user.name},</p>
      <p>Your ${isPartialPayment ? 'remaining' : ''} payment has been confirmed by our team.</p>
      <p>Booking ID: ${booking._id}</p>
      <p>Amount Confirmed: ₹${remainingAmount}</p>
      <p>Total Paid: ₹${booking.paymentDetails.paidAmount}</p>
      <p>Payment Method: ${paymentMethod || 'Offline'}</p>
      ${paymentReference ? `<p>Reference: ${paymentReference}</p>` : ''}
      <p>Your booking is now fully paid and confirmed.</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

    await sendEmail({
      email: booking.user.email,
      subject: emailSubject,
      message: emailContent,
      isHtml: true,
    });
  } catch (emailError) {
    console.error("❌ Email sending failed:", emailError);
    // Don't throw error, payment is already processed
  }

  res.status(200).json({
    success: true,
    message: "Payment marked as completed successfully",
    data: {
      booking: booking,
      paymentDetails: {
        amountConfirmed: remainingAmount,
        totalPaid: booking.paymentDetails.paidAmount,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus
      }
    }
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
