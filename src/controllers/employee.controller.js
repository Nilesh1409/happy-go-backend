import Employee from "../models/employee.model.js";
import Booking from "../models/booking.model.js";
import Order from "../models/order.model.js";
import Bike from "../models/bike.model.js";
import BikeMaintenanceRecord from "../models/bikeMaintenance.model.js";
import EmployeeDocument from "../models/employeeDocument.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import bcrypt from "bcryptjs";

// @desc    Get current employee
// @route   GET /api/employees/me
// @access  Private/Employee
export const getMe = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.employee._id);

  res.status(200).json({
    success: true,
    data: {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      assignedModules: employee.assignedModules,
      assignedEntities: employee.assignedEntities,
      profileImage: employee.profileImage,
      address: employee.address,
      emergencyContact: employee.emergencyContact,
      bio: employee.bio,
      preferences: employee.preferences || {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
      },
    },
  });
});

// @desc    Update employee profile
// @route   PUT /api/employees/profile
// @access  Private/Employee
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, address, emergencyContact, bio, preferences } =
    req.body;

  const employee = await Employee.findById(req.employee._id);

  if (!employee) {
    throw new ApiError("Employee not found", 404);
  }

  // Update fields
  if (name) employee.name = name;
  if (email) employee.email = email;
  if (phone) employee.mobile = phone;
  if (address) employee.address = address;
  if (emergencyContact) employee.emergencyContact = emergencyContact;
  if (bio) employee.bio = bio;
  if (preferences) employee.preferences = preferences;

  await employee.save();

  res.status(200).json({
    success: true,
    data: {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      assignedModules: employee.assignedModules,
      profileImage: employee.profileImage,
      address: employee.address,
      emergencyContact: employee.emergencyContact,
      bio: employee.bio,
      preferences: employee.preferences,
    },
    message: "Profile updated successfully",
  });
});

// @desc    Update employee password
// @route   PUT /api/employees/update-password
// @access  Private/Employee
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate
  if (!currentPassword || !newPassword) {
    throw new ApiError("Please provide current and new password", 400);
  }

  // Get employee with password
  const employee = await Employee.findById(req.employee._id).select(
    "+password"
  );

  // Check current password
  const isMatch = await employee.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError("Current password is incorrect", 401);
  }

  // Update password
  const salt = await bcrypt.genSalt(10);
  employee.password = await bcrypt.hash(newPassword, salt);
  await employee.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

// @desc    Get employee dashboard data with recent and pending items from past week
// @route   GET /api/employees/dashboard
// @access  Private/Employee
export const getDashboardData = asyncHandler(async (req, res) => {
  // Get employee role
  const employeeRole = req.employee.role;

  // Calculate date for one week ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Initialize counts and recent items
  let bikeBookingsCount = 0;
  let hotelBookingsCount = 0;
  let ordersCount = 0;

  // Initialize pending actions
  let pendingBikeBookings = 0;
  let pendingHotelBookings = 0;
  let pendingOrders = 0;

  // Initialize recent items
  let recentBikeBookings = [];
  let recentHotelBookings = [];
  let recentOrders = [];

  // Get data based on employee's assigned modules
  if (req.employee.assignedModules.includes("bike")) {
    // Get bike bookings count
    bikeBookingsCount = await Booking.countDocuments({
      bookingType: "bike",
      createdAt: { $gte: oneWeekAgo },
    });

    // Get pending bike bookings (pending or confirmed but not completed)
    pendingBikeBookings = await Booking.countDocuments({
      bookingType: "bike",
      createdAt: { $gte: oneWeekAgo },
      $or: [
        { bookingStatus: "pending" },
        { bookingStatus: "confirmed", endDate: { $lte: new Date() } },
      ],
    });

    // Get recent bike bookings
    recentBikeBookings = await Booking.find({
      bookingType: "bike",
      createdAt: { $gte: oneWeekAgo },
    })
      .populate({
        path: "bike",
        select: "title brand model images",
      })
      .populate({
        path: "user",
        select: "name mobile",
      })
      .sort({ createdAt: -1 })
      .limit(5);
  }

  if (req.employee.assignedModules.includes("hotel")) {
    // Get hotel bookings count
    hotelBookingsCount = await Booking.countDocuments({
      bookingType: "hotel",
      createdAt: { $gte: oneWeekAgo },
    });

    // Get pending hotel bookings (pending or confirmed but not completed)
    pendingHotelBookings = await Booking.countDocuments({
      bookingType: "hotel",
      createdAt: { $gte: oneWeekAgo },
      $or: [
        { bookingStatus: "pending" },
        { bookingStatus: "confirmed", endDate: { $lte: new Date() } },
      ],
    });

    // Get recent hotel bookings
    recentHotelBookings = await Booking.find({
      bookingType: "hotel",
      createdAt: { $gte: oneWeekAgo },
    })
      .populate({
        path: "hotel",
        select: "name location images",
      })
      .populate({
        path: "user",
        select: "name mobile",
      })
      .sort({ createdAt: -1 })
      .limit(5);
  }

  if (req.employee.assignedModules.includes("product")) {
    // Get orders count
    ordersCount = await Order.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    // Get pending orders (pending or processing)
    pendingOrders = await Order.countDocuments({
      createdAt: { $gte: oneWeekAgo },
      orderStatus: { $in: ["pending", "processing"] },
    });

    // Get recent orders
    recentOrders = await Order.find({
      createdAt: { $gte: oneWeekAgo },
    })
      .populate({
        path: "products.product",
        select: "title images",
      })
      .populate({
        path: "user",
        select: "name mobile",
      })
      .sort({ createdAt: -1 })
      .limit(5);
  }

  // Calculate total counts and pending actions
  const totalCount = bikeBookingsCount + hotelBookingsCount + ordersCount;
  const totalPendingActions =
    pendingBikeBookings + pendingHotelBookings + pendingOrders;

  res.status(200).json({
    success: true,
    data: {
      counts: {
        bikeBookings: bikeBookingsCount,
        hotelBookings: hotelBookingsCount,
        orders: ordersCount,
        total: totalCount,
      },
      pendingActions: {
        bikeBookings: pendingBikeBookings,
        hotelBookings: pendingHotelBookings,
        orders: pendingOrders,
        total: totalPendingActions,
      },
      recent: {
        bikeBookings: recentBikeBookings,
        hotelBookings: recentHotelBookings,
        orders: recentOrders,
      },
    },
  });
});

// @desc    Get bookings for employee based on their assigned modules
// @route   GET /api/employees/bookings
// @access  Private/Employee
export const getEmployeeBookings = asyncHandler(async (req, res) => {
  const {
    status,
    startDate,
    endDate,
    type,
    limit = 10,
    page = 1,
    sort,
  } = req.query;

  // Build query based on employee's assigned modules
  const query = {};

  console.log("🚀 ~ getEmployeeBookings ~ type:", type);
  // Filter by employee's assigned modules if type is not specified
  if (type) {
    // If specific type is requested, check if employee has access to it
    if (!req.employee.assignedModules.includes(type)) {
      throw new ApiError(`You don't have access to ${type} bookings`, 403);
    }
    query.bookingType = type;
  } else {
    // Otherwise, show only bookings for modules the employee has access to
    query.bookingType = { $in: req.employee.assignedModules };
  }

  console.log("🚀 ~ getEmployeeBookings ~ query:", query);
  // Filter by status if provided
  if (status && status !== "all") {
    query.bookingStatus = status.toLowerCase();
  }

  // Filter by date range if provided
  if (startDate || endDate) {
    const sd = startDate ? new Date(startDate) : null;
    const ed = endDate ? new Date(endDate) : null;

    if (sd && ed) {
      // Overlap: booking.startDate ≤ ed  AND  booking.endDate ≥ sd
      query.$and = [{ startDate: { $lte: ed } }, { endDate: { $gte: sd } }];
    } else if (sd) {
      // Only a lower‐bound: any booking whose endDate ≥ sd
      query.endDate = { $gte: sd };
    } else if (ed) {
      // Only an upper‐bound: any booking whose startDate ≤ ed
      query.startDate = { $lte: ed };
    }
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
      select: "title brand model images registrationNumber",
    })
    .populate({
      path: "hotel",
      select: "name location images rooms",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  // Format bookings for response
  const formattedBookings = bookings.map((booking) => {
    let itemName = "";
    let itemImage = "";

    if (booking.bookingType === "bike" && booking.bike) {
      itemName = `${booking.bike.brand} ${booking.bike.model}`;
      itemImage =
        booking.bike.images && booking.bike.images.length > 0
          ? booking.bike.images[0]
          : "";
    } else if (booking.bookingType === "hotel" && booking.hotel) {
      const roomType = booking.roomType || "Standard Room";
      itemName = `${roomType} - ${booking.hotel.name}`;
      itemImage =
        booking.hotel.images && booking.hotel.images.length > 0
          ? booking.hotel.images[0]
          : "";
    }

    return {
      id: booking._id,
      bookingType:
        booking.bookingType.charAt(0).toUpperCase() +
        booking.bookingType.slice(1),
      customerName: booking.user ? booking.user.name : "Unknown Customer",
      customerPhone: booking.user ? booking.user.mobile : "N/A",
      customerEmail: booking.user ? booking.user.email : "N/A",
      itemName,
      itemImage,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalAmount: booking.priceDetails.totalAmount,
      status:
        booking.bookingStatus.charAt(0).toUpperCase() +
        booking.bookingStatus.slice(1),
      paymentStatus:
        booking.paymentStatus.charAt(0).toUpperCase() +
        booking.paymentStatus.slice(1),
      createdAt: booking.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    count: formattedBookings.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: formattedBookings,
  });
});

// @desc    Get booking details by ID
// @route   GET /api/employees/bookings/:id
// @access  Private/Employee
export const getEmployeeBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: "bike",
      select: "title brand model images registrationNumber pricePerDay",
    })
    .populate({
      path: "hotel",
      select: "name location images rooms",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    });

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if employee has access to this booking type
  if (!req.employee.assignedModules.includes(booking.bookingType)) {
    throw new ApiError(
      `You don't have access to ${booking.bookingType} bookings`,
      403
    );
  }

  // Format booking for response
  const formattedBooking = {
    id: booking._id,
    type: booking.bookingType,
    status: booking.bookingStatus,
    startDate: booking.startDate,
    endDate: booking.endDate,
    startTime: booking.startTime || null,
    endTime: booking.endTime || null,
    amount: booking.priceDetails.totalAmount,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentId ? "Online Payment" : "Cash on Delivery",
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    notes: booking.specialRequests || "",
    customer: {
      name: booking.user ? booking.user.name : "Unknown Customer",
      email: booking.user ? booking.user.email : "N/A",
      phone: booking.user ? booking.user.mobile : "N/A",
    },
  };

  // Add type-specific details
  if (booking.bookingType === "bike" && booking.bike) {
    const duration = Math.ceil(
      (new Date(booking.endDate) - new Date(booking.startDate)) /
        (1000 * 60 * 60 * 24)
    );

    formattedBooking.bike = {
      name: `${booking.bike.brand} ${booking.bike.model}`,
      model: booking.bike.model,
      image:
        booking.bike.images && booking.bike.images.length > 0
          ? booking.bike.images[0]
          : "",
      registrationNumber: booking.bike.registrationNumber,
      pricePerDay: booking.bike.pricePerDay.limitedKm.price,
    };

    formattedBooking.duration = duration;

    if (booking.bikeDetails) {
      formattedBooking.kmLimit = booking.bikeDetails.kmLimit;
      formattedBooking.isUnlimited = booking.bikeDetails.isUnlimited;
      formattedBooking.initialKmReading = booking.bikeDetails.initialKmReading;
      formattedBooking.finalKmReading = booking.bikeDetails.finalKmReading;

      if (booking.bikeDetails.additionalCharges) {
        formattedBooking.additionalCharges =
          booking.bikeDetails.additionalCharges;
      }
    }
  } else if (booking.bookingType === "hotel" && booking.hotel) {
    formattedBooking.hotel = {
      name: booking.hotel.name,
      location: booking.hotel.location,
      image:
        booking.hotel.images && booking.hotel.images.length > 0
          ? booking.hotel.images[0]
          : "",
    };

    formattedBooking.checkInDate = booking.startDate;
    formattedBooking.checkOutDate = booking.endDate;
    formattedBooking.roomType = booking.roomType;
    formattedBooking.guests = booking.numberOfPeople;

    if (booking.hotelDetails) {
      formattedBooking.roomOption = booking.hotelDetails.roomOption;
      formattedBooking.checkInTime = booking.hotelDetails.checkInTime;
    }
  }

  res.status(200).json({
    success: true,
    data: formattedBooking,
  });
});

// @desc    Get assigned bookings
// @route   GET /api/employees/bookings
// @access  Private/Employee
export const getAssignedBookings = asyncHandler(async (req, res) => {
  const { type, status, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = { assignedEmployee: req.employee._id };

  // Filter by type
  if (type) {
    query.bookingType = type;
  } else {
    // Filter by assigned modules
    query.bookingType = { $in: req.employee.assignedModules };
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

// @desc    Get assigned orders
// @route   GET /api/employees/orders
// @access  Private/Employee
export const getAssignedOrders = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = { assignedEmployee: req.employee._id };

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

// @desc    Update booking status by employee
// @route   PUT /api/employees/bookings/:id/status
// @access  Private/Employee
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, initialKmReading, finalKmReading, additionalCharges } =
    req.body;

  // Validate status
  if (!status || !["confirmed", "cancelled", "completed"].includes(status)) {
    throw new ApiError("Invalid status", 400);
  }

  // Get booking
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Update bookingStatus
  booking.bookingStatus = status;

  // For bike bookings, update additional details
  if (booking.bookingType === "bike") {
    if (status === "confirmed" && initialKmReading) {
      booking.bikeDetails.initialKmReading = initialKmReading;
    }

    if (status === "completed") {
      // ‣ require finalKmReading
      if (!finalKmReading) {
        throw new ApiError("Please provide final km reading", 400);
      }
      booking.bikeDetails.finalKmReading = finalKmReading;

      // ‣ calculate any extra charges
      if (additionalCharges) {
        booking.bikeDetails.additionalCharges = additionalCharges;
      }

      // → set endTime to current time (HH:mm)
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      booking.endTime = `${hh}:${mm}`;
    }
  }

  if (status === "completed") {
    // 1. Capture “now”:
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    // 2. Set booking.endDate = today’s date, booking.endTime = current time
    booking.endDate = new Date(`${year}-${month}-${day}`); // a Date at midnight of today; exact-time is in endTime
    booking.endTime = `${hh}:${mm}`;

    // 3. Build a Date object for the original scheduled endDate+endTime
    //    (use the *previous* values of booking.endDate/endTime, before you overwrote them).
    //    So, store the old values first:
    const oldEndDateOnly = booking.get("endDate", { getters: false }); // this is the Date field just before we overwrote it
    const oldEndTimeString = booking.get("endTime", { getters: false }); // e.g. "18:30"

    // Parse the oldEndTimeString into hours/minutes:
    let scheduledEnd = null;
    if (oldEndDateOnly && oldEndTimeString) {
      const [oldHour, oldMinute] = oldEndTimeString
        .split(":")
        .map((s) => parseInt(s, 10));
      scheduledEnd = new Date(oldEndDateOnly);
      scheduledEnd.setHours(oldHour, oldMinute, 0, 0);
    }

    // 4. If “now” > scheduledEnd, calculate extraDays and extraHours
    let isLate = false;
    let extraDays = 0;
    let extraHours = 0;

    if (scheduledEnd && now > scheduledEnd) {
      isLate = true;
      const diffMs = now.getTime() - scheduledEnd.getTime();

      // compute total full days
      extraDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // subtract those days, then compute leftover hours
      const remainingAfterDays = diffMs - extraDays * (1000 * 60 * 60 * 24);
      extraHours = Math.floor(remainingAfterDays / (1000 * 60 * 60));
    }

    // 5. Set booking.overdueInfo
    booking.overdueInfo = {
      actualReturnDate: now,
      extraDays: isLate ? extraDays : 0,
      extraHours: isLate ? extraHours : 0,
      // If you have a per-hour or per-day charge, compute it here:
      // overdueCharges: isLate ? (extraDays * DAY_RATE + extraHours * HOUR_RATE) : 0,
    };

    // (Optionally, you could also add a “lateMessage” field on booking if you want it stored in Mongo)
    // For now, we’ll return it in the response JSON.
  }

  await booking.save();

  let lateBy = null;
  if (
    status === "completed" &&
    booking.overdueInfo?.extraDays + booking.overdueInfo?.extraHours > 0
  ) {
    lateBy = `${booking.overdueInfo.extraDays} day(s) and ${booking.overdueInfo.extraHours} hour(s)`;
  }

  res.status(200).json({
    success: true,
    data: booking,
    lateBy,
  });
});

// @desc    Update order status by employee
// @route   PUT /api/employees/orders/:id/status
// @access  Private/Employee
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Validate status
  if (
    !status ||
    !["processing", "shipped", "delivered", "cancelled"].includes(status)
  ) {
    throw new ApiError("Invalid status", 400);
  }

  // Get order
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError("Order not found", 404);
  }

  // Check if order is assigned to employee
  if (order.assignedEmployee?.toString() !== req.employee._id.toString()) {
    throw new ApiError("Not authorized to update this order", 401);
  }

  // Update order
  order.orderStatus = status;
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Get all bikes assigned to employee
// @route   GET /api/employees/bikes
// @access  Private/Employee
export const getEmployeeBikes = asyncHandler(async (req, res) => {
  const { status } = req.query;

  // 1. Fetch all bikes
  const bikes = await Bike.find({}).lean();

  // 2. Fetch any bookings that span "now"
  const now = new Date();
  const activeBookings = await Booking.find({
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed", "pending"] },
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .select("bike endDate endTime")
    .lean();

  // 3. Group end-times by bike ID
  const bookingMap = activeBookings.reduce((map, bk) => {
    const id = bk.bike.toString();
    const [eh, em] = bk.endTime.split(":").map(Number);
    const endDt = new Date(bk.endDate);
    endDt.setHours(eh, em, 0, 0);
    map[id] = map[id] || [];
    map[id].push(endDt);
    return map;
  }, {});

  // 4. Format each bike with real availability & nextAvailable
  const formatted = bikes.map((bike) => {
    const id = bike._id.toString();
    const total = bike.quantity ?? 1;
    const bookedEnds = bookingMap[id] || [];
    const bookedCount = bookedEnds.length;
    const availQty = Math.max(0, total - bookedCount);

    let bikeStatus = "available";
    if (!bike.isAvailable) bikeStatus = "maintenance";
    else if (availQty === 0) bikeStatus = "booked";

    let nextAvailable = null;
    if (availQty === 0 && bookedEnds.length > 0) {
      const earliestMs = Math.min(...bookedEnds.map((d) => d.getTime()));
      nextAvailable = new Date(earliestMs).toISOString();
    }

    return {
      _id: bike._id,
      title: bike.title,
      model: bike.model,
      bikeId: bike.registrationNumber,
      category: bike.brand,
      rentalPrice: bike.pricePerDay.limitedKm.price,
      images: bike.images,
      status: bikeStatus,
      quantity: total,
      availableQuantity: availQty,
      ...(nextAvailable && { nextAvailable }),
    };
  });

  // 5. Apply query-param filter if any
  const data =
    status && status !== "all"
      ? formatted.filter((b) => b.status === status)
      : formatted;

  res.status(200).json({
    success: true,
    data,
  });
});

// @desc    Get bike details
// @route   GET /api/employees/bikes/:id
// @access  Private/Employee
export const getEmployeeBikeById = asyncHandler(async (req, res) => {
  const bike = await Bike.findById(req.params.id);
  if (!bike) throw new ApiError("Bike not found", 404);

  // Format response for edit form
  const formattedBike = {
    _id: bike._id,
    title: bike.title,
    brand: bike.brand, // for your Brand input
    model: bike.model,
    year: bike.year,
    description: bike.description,
    bikeId: bike.registrationNumber,
    location: bike.location,
    features: bike.features,
    requiredDocuments: bike.requiredDocuments,
    quantity: bike.quantity,
    images: bike.images,
    status: bike.isAvailable ? "available" : "maintenance",
    pricePerDay: {
      limitedKm: {
        price: bike.pricePerDay.limitedKm.price,
        kmLimit: bike.pricePerDay.limitedKm.kmLimit,
        isActive: bike.pricePerDay.limitedKm.isActive,
      },
      unlimited: {
        price: bike.pricePerDay.unlimited.price,
        isActive: bike.pricePerDay.unlimited.isActive,
      },
    },
    additionalKmPrice: bike.additionalKmPrice,
  };

  res.status(200).json({
    success: true,
    data: formattedBike,
  });
});

// @desc    Create new bike
// @route   POST /api/employees/bikes
// @access  Private/Employee
export const createBike = asyncHandler(async (req, res) => {
  const {
    title,
    model,
    bikeId,
    category,
    rentalPrice,
    description,
    location,
    features,
    images,
    status,
  } = req.body;

  // Validate required fields
  if (
    !title ||
    !model ||
    !bikeId ||
    !category ||
    !rentalPrice ||
    !description ||
    !location ||
    !features ||
    !images
  ) {
    throw new ApiError("Please provide all required fields", 400);
  }

  // Create bike
  const bike = await Bike.create({
    title,
    brand: category,
    model,
    year: new Date().getFullYear(),
    description,
    registrationNumber: bikeId,
    location,
    features,
    images,
    pricePerDay: {
      limitedKm: {
        price: Number(rentalPrice),
        kmLimit: 60,
      },
      unlimited: {
        price: Number(rentalPrice) * 1.5,
      },
    },
    additionalKmPrice: 4,
    isAvailable: status === "available",
    isTrending: false,
  });

  res.status(201).json({
    success: true,
    data: bike,
  });
});

// @desc    Update bike
// @route   PUT /api/employees/bikes/:id
// @access  Private/Employee
export const updateBike = asyncHandler(async (req, res) => {
  const {
    title,
    model,
    bikeId,
    category,
    description,
    location,
    features,
    images,
    status,
    quantity,
    year,
    requiredDocuments,
    pricePerDay, // ← NEW
    additionalKmPrice, // ← NEW
  } = req.body;

  const bike = await Bike.findById(req.params.id);
  if (!bike) throw new ApiError("Bike not found", 404);

  // Update scalar fields
  if (title) bike.title = title;
  if (model) bike.model = model;
  if (bikeId) bike.registrationNumber = bikeId;
  if (category) bike.brand = category;
  if (description) bike.description = description;
  if (location) bike.location = location;
  if (features) bike.features = features;
  if (images) bike.images = images;
  if (status) bike.isAvailable = status === "available";
  if (quantity !== undefined) bike.quantity = Number(quantity);
  if (year) bike.year = Number(year);
  if (requiredDocuments) bike.requiredDocuments = requiredDocuments;

  // Update pricing
  if (pricePerDay) {
    const { limitedKm, unlimited } = pricePerDay;
    if (limitedKm) {
      if (limitedKm.price !== undefined)
        bike.pricePerDay.limitedKm.price = Number(limitedKm.price);
      if (limitedKm.kmLimit !== undefined)
        bike.pricePerDay.limitedKm.kmLimit = Number(limitedKm.kmLimit);
      if (limitedKm.isActive !== undefined)
        bike.pricePerDay.limitedKm.isActive = Boolean(limitedKm.isActive);
    }
    if (unlimited) {
      if (unlimited.price !== undefined)
        bike.pricePerDay.unlimited.price = Number(unlimited.price);
      if (unlimited.isActive !== undefined)
        bike.pricePerDay.unlimited.isActive = Boolean(unlimited.isActive);
    }
  }

  // Update additional km price if provided
  if (additionalKmPrice !== undefined) {
    bike.additionalKmPrice = Number(additionalKmPrice);
  }

  await bike.save();

  res.status(200).json({
    success: true,
    data: bike,
  });
});

// @desc    Update bike status
// @route   PATCH /api/employees/bikes/:id/status
// @access  Private/Employee
export const updateBikeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !["available", "maintenance"].includes(status)) {
    throw new ApiError("Invalid status", 400);
  }

  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  bike.isAvailable = status === "available";
  await bike.save();

  res.status(200).json({
    success: true,
    data: {
      _id: bike._id,
      status: bike.isAvailable ? "available" : "maintenance",
    },
  });
});

// @desc    Add bike maintenance record
// @route   POST /api/employees/bikes/:id/maintenance
// @access  Private/Employee
export const addBikeMaintenance = asyncHandler(async (req, res) => {
  const { note } = req.body;

  if (!note) {
    throw new ApiError("Please provide maintenance details", 400);
  }

  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Create maintenance record
  const maintenanceRecord = await BikeMaintenanceRecord.create({
    bike: bike._id,
    note,
    createdBy: req.employee._id,
    completed: false,
  });

  // Update bike status
  bike.isAvailable = false;
  await bike.save();

  res.status(201).json({
    success: true,
    data: maintenanceRecord,
  });
});

// @desc    Complete bike maintenance
// @route   PATCH /api/employees/bikes/maintenance/:id/complete
// @access  Private/Employee
export const completeBikeMaintenance = asyncHandler(async (req, res) => {
  const maintenanceRecord = await BikeMaintenanceRecord.findById(req.params.id);

  if (!maintenanceRecord) {
    throw new ApiError("Maintenance record not found", 404);
  }

  // Update maintenance record
  maintenanceRecord.completed = true;
  maintenanceRecord.completedBy = req.employee._id;
  maintenanceRecord.completedAt = Date.now();
  await maintenanceRecord.save();

  // Update bike status
  const bike = await Bike.findById(maintenanceRecord.bike);
  if (bike) {
    bike.isAvailable = true;
    await bike.save();
  }

  res.status(200).json({
    success: true,
    data: maintenanceRecord,
  });
});

// @desc    Get bike maintenance history
// @route   GET /api/employees/bikes/:id/maintenance
// @access  Private/Employee
export const getBikeMaintenanceHistory = asyncHandler(async (req, res) => {
  const maintenanceRecords = await BikeMaintenanceRecord.find({
    bike: req.params.id,
  })
    .populate({
      path: "createdBy",
      select: "name",
    })
    .populate({
      path: "completedBy",
      select: "name",
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: maintenanceRecords,
  });
});

// @desc    Get bike booking history
// @route   GET /api/employees/bikes/:id/bookings
// @access  Private/Employee
export const getBikeBookingHistory = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    bike: req.params.id,
    bookingType: "bike",
  })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: bookings,
  });
});

// @desc    Upload document
// @route   POST /api/employees/upload
// @access  Private/Employee
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError("Please upload at least one file", 400);
  }

  // Process uploaded files
  const uploadedFiles = req.files.map((file) => ({
    url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  }));

  res.status(200).json({
    success: true,
    data: {
      imageUrls: uploadedFiles.map((file) => file.url),
    },
  });
});

// @desc    Get employee documents
// @route   GET /api/employees/documents
// @access  Private/Employee
export const getDocuments = asyncHandler(async (req, res) => {
  const documents = await EmployeeDocument.find({
    employee: req.employee._id,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: documents,
  });
});

// @desc    Delete document
// @route   DELETE /api/employees/documents/:id
// @access  Private/Employee
export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await EmployeeDocument.findById(req.params.id);

  if (!document) {
    throw new ApiError("Document not found", 404);
  }

  // Check if document belongs to employee
  if (document.employee.toString() !== req.employee._id.toString()) {
    throw new ApiError("Not authorized to delete this document", 401);
  }

  await document.deleteOne();

  res.status(200).json({
    success: true,
    message: "Document deleted successfully",
  });
});
