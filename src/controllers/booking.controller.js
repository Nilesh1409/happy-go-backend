import Booking from "../models/booking.model.js";
import Bike from "../models/bike.model.js";
import Hotel from "../models/hotel.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../utils/sendEmail.js";

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = asyncHandler(async (req, res) => {
  const {
    bookingType,
    bikeId,
    hotelId,
    roomType,
    startDate,
    endDate,
    startTime,
    endTime,
    numberOfPeople,
    priceDetails,
    bikeDetails,
    hotelDetails,
    couponCode,
    specialRequests,
  } = req.body;

  // Validate booking type
  if (!bookingType || !["bike", "hotel"].includes(bookingType)) {
    throw new ApiError("Invalid booking type", 400);
  }

  // Validate required fields based on booking type
  if (bookingType === "bike") {
    if (
      !bikeId ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !bikeDetails
    ) {
      throw new ApiError(
        "Please provide all required fields for bike booking",
        400
      );
    }

    // Check if bike exists
    const bike = await Bike.findById(bikeId);
    if (!bike) {
      throw new ApiError("Bike not found", 404);
    }

    // Check if bike is available
    const existingBookings = await Booking.find({
      bookingType: "bike",
      bike: bikeId,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
      bookingStatus: { $nin: ["cancelled"] },
    });

    if (existingBookings.length > 0) {
      throw new ApiError("Bike is not available for the selected dates", 400);
    }
  } else if (bookingType === "hotel") {
    if (
      !hotelId ||
      !roomType ||
      !startDate ||
      !endDate ||
      !numberOfPeople ||
      !hotelDetails
    ) {
      throw new ApiError(
        "Please provide all required fields for hotel booking",
        400
      );
    }

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      throw new ApiError("Hotel not found", 404);
    }

    // Check if room type exists
    const room = hotel.rooms.find((r) => r.type === roomType);
    if (!room) {
      throw new ApiError("Room type not found", 404);
    }

    // Check if room is available
    const existingBookings = await Booking.find({
      bookingType: "hotel",
      hotel: hotelId,
      roomType,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
      bookingStatus: { $nin: ["cancelled"] },
    });

    if (existingBookings.length >= room.totalRooms) {
      throw new ApiError("Room is not available for the selected dates", 400);
    }
  }

  // Create booking
  const booking = await Booking.create({
    user: req.user._id,
    bookingType,
    bike: bookingType === "bike" ? bikeId : undefined,
    hotel: bookingType === "hotel" ? hotelId : undefined,
    roomType: bookingType === "hotel" ? roomType : undefined,
    startDate,
    endDate,
    startTime: bookingType === "bike" ? startTime : undefined,
    endTime: bookingType === "bike" ? endTime : undefined,
    numberOfPeople: bookingType === "hotel" ? numberOfPeople : undefined,
    priceDetails,
    bikeDetails: bookingType === "bike" ? bikeDetails : undefined,
    hotelDetails: bookingType === "hotel" ? hotelDetails : undefined,
    couponCode,
    specialRequests,
    bookingStatus: "pending", // Set initial status
  });

  // Send confirmation email
  const user = await User.findById(req.user._id);
  const bookingTypeText = bookingType === "bike" ? "Bike" : "Hotel";

  const emailMessage = `
    <h1>Booking Confirmation</h1>
    <p>Dear ${user.name},</p>
    <p>Your ${bookingTypeText} booking has been confirmed.</p>
    <p>Booking ID: ${booking._id}</p>
    <p>Start Date: ${new Date(startDate).toLocaleDateString()}</p>
    <p>End Date: ${new Date(endDate).toLocaleDateString()}</p>
    <p>Total Amount: ₹${priceDetails.totalAmount}</p>
    <p>Thank you for choosing HappyGo!</p>
  `;

  await sendEmail({
    email: user.email,
    subject: `HappyGo ${bookingTypeText} Booking Confirmation`,
    message: emailMessage,
  });

  // Send confirmation SMS
  const smsMessage = `Your HappyGo ${bookingTypeText} booking is confirmed. Booking ID: ${booking._id}. Total Amount: ₹${priceDetails.totalAmount}. Thank you for choosing HappyGo!`;

  // await sendSMS({
  //   phone: user.mobile,
  //   message: smsMessage,
  // })

  res.status(201).json({
    success: true,
    data: booking,
  });
});

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = asyncHandler(async (req, res) => {
  console.log("🚀 ~ getBookings ~ req:", req.user);
  const { type, status, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = { user: req.user._id };

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
  console.log("🚀 ~ getBookings ~ query:", query);
  const bookings = await Booking.find(query)
    .populate({
      path: "bike",
      select: "title brand model images",
    })
    .populate({
      path: "hotel",
      select: "name location images",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));
  console.log("🚀 ~ getBookings ~ bookings:", bookings);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: bookings,
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: "bike",
      select: "title brand model images pricePerDay additionalKmPrice",
    })
    .populate({
      path: "hotel",
      select: "name location images rooms",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .populate({
      path: "assignedEmployee",
      select: "name email mobile",
    });

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking belongs to user
  if (
    booking.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError("Not authorized to access this booking", 401);
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body;

  // Validate status
  if (!status || !["confirmed", "cancelled", "completed"].includes(status)) {
    throw new ApiError("Invalid status", 400);
  }

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking belongs to user
  if (
    booking.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError("Not authorized to update this booking", 401);
  }

  // If cancelling, require reason
  if (status === "cancelled" && !cancellationReason) {
    throw new ApiError("Please provide a cancellation reason", 400);
  }

  // Update booking
  booking.bookingStatus = status;
  if (status === "cancelled") {
    booking.cancellationReason = cancellationReason;
  }

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Upload documents for bike booking
// @route   PUT /api/bookings/:id/documents
// @access  Private
export const uploadDocuments = asyncHandler(async (req, res) => {
  const { idProof, drivingLicense, addressProof } = req.body;

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking belongs to user
  if (booking.user.toString() !== req.user._id.toString()) {
    throw new ApiError("Not authorized to update this booking", 401);
  }

  // Check if booking is for bike
  if (booking.bookingType !== "bike") {
    throw new ApiError("Documents can only be uploaded for bike bookings", 400);
  }

  // Update documents
  booking.bikeDetails.documentsSubmitted = {
    idProof: idProof || booking.bikeDetails.documentsSubmitted?.idProof,
    drivingLicense:
      drivingLicense || booking.bikeDetails.documentsSubmitted?.drivingLicense,
    addressProof:
      addressProof || booking.bikeDetails.documentsSubmitted?.addressProof,
  };

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Calculate additional charges for bike booking
// @route   POST /api/bookings/:id/additional-charges
// @access  Private/Employee
export const calculateAdditionalCharges = asyncHandler(async (req, res) => {
  const { finalKmReading } = req.body;

  // Get booking
  const booking = await Booking.findById(req.params.id).populate({
    path: "bike",
    select: "additionalKmPrice",
  });

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking is for bike
  if (booking.bookingType !== "bike") {
    throw new ApiError(
      "Additional charges can only be calculated for bike bookings",
      400
    );
  }

  // Check if booking is assigned to employee
  if (booking.assignedEmployee?.toString() !== req.employee._id.toString()) {
    throw new ApiError("Not authorized to update this booking", 401);
  }

  // Calculate additional charges
  const initialKmReading = booking.bikeDetails.initialKmReading || 0;
  const kmLimit = booking.bikeDetails.kmLimit;
  const isUnlimited = booking.bikeDetails.isUnlimited;

  // If unlimited plan, no additional charges
  if (isUnlimited) {
    booking.bikeDetails.finalKmReading = finalKmReading;
    booking.bikeDetails.additionalCharges = {
      amount: 0,
      reason: "Unlimited plan",
    };
  } else {
    const kmTravelled = finalKmReading - initialKmReading;
    const additionalKm = Math.max(0, kmTravelled - kmLimit);
    const additionalCharges = additionalKm * booking.bike.additionalKmPrice;

    booking.bikeDetails.finalKmReading = finalKmReading;
    booking.bikeDetails.additionalCharges = {
      amount: additionalCharges,
      reason:
        additionalKm > 0
          ? `Exceeded km limit by ${additionalKm} km`
          : "No additional charges",
    };
  }

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Get hotel bookings
// @route   GET /api/bookings/hotels
// @access  Private
export const getHotelBookings = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query;

  // Build query for hotel bookings
  const query = {
    user: req.user._id,
    bookingType: "hotel",
  };

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
      path: "hotel",
      select: "name location images",
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

// @desc    Get bike bookings
// @route   GET /api/bookings/bikes
// @access  Private
export const getBikeBookings = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query;

  // Build query for bike bookings
  const query = {
    user: req.user._id,
    bookingType: "bike",
  };

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

// @desc    Update hotel booking details
// @route   PUT /api/bookings/:id/hotel-details
// @access  Private
export const updateHotelBookingDetails = asyncHandler(async (req, res) => {
  const { checkInTime, specialRequests } = req.body;

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking belongs to user
  if (
    booking.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError("Not authorized to update this booking", 401);
  }

  // Check if booking is for hotel
  if (booking.bookingType !== "hotel") {
    throw new ApiError("This endpoint is only for hotel bookings", 400);
  }

  // Update hotel details
  if (checkInTime) {
    booking.hotelDetails.checkInTime = checkInTime;
  }

  if (specialRequests) {
    booking.specialRequests = specialRequests;
  }

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private/Admin
export const getBookingStats = asyncHandler(async (req, res) => {
  // Get total counts by type
  const totalBikeBookings = await Booking.countDocuments({
    bookingType: "bike",
  });
  const totalHotelBookings = await Booking.countDocuments({
    bookingType: "hotel",
  });

  // Get counts by status
  const pendingBookings = await Booking.countDocuments({
    bookingStatus: "pending",
  });
  const confirmedBookings = await Booking.countDocuments({
    bookingStatus: "confirmed",
  });
  const cancelledBookings = await Booking.countDocuments({
    bookingStatus: "cancelled",
  });
  const completedBookings = await Booking.countDocuments({
    bookingStatus: "completed",
  });

  // Get revenue stats
  const revenueStats = await Booking.aggregate([
    {
      $match: { bookingStatus: { $in: ["confirmed", "completed"] } },
    },
    {
      $group: {
        _id: "$bookingType",
        totalRevenue: { $sum: "$priceDetails.totalAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Format revenue stats
  const bikeRevenue =
    revenueStats.find((item) => item._id === "bike")?.totalRevenue || 0;
  const hotelRevenue =
    revenueStats.find((item) => item._id === "hotel")?.totalRevenue || 0;
  const totalRevenue = bikeRevenue + hotelRevenue;

  res.status(200).json({
    success: true,
    data: {
      totalBookings: totalBikeBookings + totalHotelBookings,
      byType: {
        bike: totalBikeBookings,
        hotel: totalHotelBookings,
      },
      byStatus: {
        pending: pendingBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        completed: completedBookings,
      },
      revenue: {
        total: totalRevenue,
        bike: bikeRevenue,
        hotel: hotelRevenue,
      },
    },
  });
});
