import Booking from "../models/booking.model.js";
import Bike from "../models/bike.model.js";
import Hotel from "../models/hotel.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../utils/sendEmail.js";
import Helmet from "../models/helmet.model.js";
import { calculateRentalPricing, calculateExtraAmount } from "../utils/bikePricing.js";
// const mongoose = require("mongoose");

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
    guestDetails,
  } = req.body;

  // Validate booking type
  if (!bookingType || !["bike", "hotel"].includes(bookingType)) {
    throw new ApiError("Invalid booking type", 400);
  }

  // Validate required fields based on booking type
  if (bookingType === "bike") {
    // Validate required bike fields
    if (
      !bikeId ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !bikeDetails
    ) {
      throw new ApiError(
        "Please provide bikeId, startDate, endDate, startTime, endTime and bikeDetails",
        400
      );
    }

    // Fetch bike document
    const bike = await Bike.findById(bikeId);
    if (!bike) {
      throw new ApiError("Bike not found", 404);
    }

    // Validate helmet availability and charges if requested
    const requestedHelmets = bikeDetails.helmetQuantity || 0;
    if (requestedHelmets > 0) {
      const helmet = await Helmet.findOne({ isActive: true });
      if (!helmet) {
        throw new ApiError("Helmet service is currently unavailable", 400);
      }

      // Check helmet availability for the requested period
      const helmetBookings = await Booking.aggregate([
        {
          $match: {
            bookingType: "bike",
            bookingStatus: { $in: ["confirmed", "pending"] },
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(startDate) },
            "bikeDetails.helmetQuantity": { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            totalHelmetBookings: { $sum: "$bikeDetails.helmetQuantity" },
          },
        },
      ]);

      const bookedHelmets = helmetBookings[0]?.totalHelmetBookings || 0;
      const availableHelmets = helmet.totalQuantity - bookedHelmets;

      if (requestedHelmets > availableHelmets) {
        throw new ApiError(
          `Only ${availableHelmets} helmets available for the selected period`,
          400
        );
      }

      // Validate helmet charges calculation
      const expectedHelmetCharges = Math.max(0, requestedHelmets - helmet.freeHelmetPerBooking) * helmet.pricePerHelmet;
      const sentHelmetCharges = priceDetails.helmetCharges || 0;
      
      if (Math.abs(expectedHelmetCharges - sentHelmetCharges) > 0.01) {
        console.log("Helmet charges mismatch:", {
          expected: expectedHelmetCharges,
          sent: sentHelmetCharges,
          requestedHelmets,
          freeHelmets: helmet.freeHelmetPerBooking,
          pricePerHelmet: helmet.pricePerHelmet
        });
        throw new ApiError("Helmet charges calculation mismatch. Please refresh and try again.", 400);
      }
    }

    // Parse requested start/end as Date objects
    const startRequested = new Date(`${startDate}T${startTime}:00`);
    const endRequested = new Date(`${endDate}T${endTime}:00`);

    if (isNaN(startRequested) || isNaN(endRequested)) {
      throw new ApiError("Invalid date or time format", 400);
    }
    if (startRequested >= endRequested) {
      throw new ApiError("Start date/time must be before end date/time", 400);
    }

    // Build a query to load all existing bike bookings that could overlap
    const startDateOnly = new Date(startDate);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(endDate);
    endDateOnly.setHours(23, 59, 59, 999);

    const rawBookings = await Booking.find({
      bookingType: "bike",
      bike: bikeId,
      bookingStatus: { $in: ["confirmed"] },
      startDate: { $lte: endDateOnly },
      endDate: { $gte: startDateOnly },
    }).select("startDate endDate startTime endTime bike");

    // Group those bookings by bikeId
    const bookingsByBike = rawBookings.reduce((map, bk) => {
      const bStart = new Date(bk.startDate);
      const [sh, sm] = bk.startTime.split(":").map(Number);
      bStart.setHours(sh, sm, 0, 0);

      const bEnd = new Date(bk.endDate);
      const [eh, em] = bk.endTime.split(":").map(Number);
      bEnd.setHours(eh, em, 0, 0);

      if (bStart <= endRequested && bEnd >= startRequested) {
        const idStr = bk.bike.toString();
        if (!map[idStr]) map[idStr] = [];
        map[idStr].push({ start: bStart, end: bEnd });
      }
      return map;
    }, {});

    // Determine how many units of this bike type are already overlapping
    const bikeIdStr = bike._id.toString();
    const overlappingBookings = bookingsByBike[bikeIdStr] || [];
    const alreadyBookedCount = overlappingBookings.length;
    const totalUnits = bike.quantity;

    if (alreadyBookedCount >= totalUnits) {
      throw new ApiError("Bike is not available for the selected period", 400);
    }

    // Validate pricing options
    if (bikeDetails.isUnlimited && !bike.pricePerDay.unlimited.isActive) {
      throw new ApiError(
        "Unlimited km option is not available for this bike",
        400
      );
    }
    if (!bikeDetails.isUnlimited && !bike.pricePerDay.limitedKm.isActive) {
      throw new ApiError(
        "Limited km option is not available for this bike",
        400
      );
    }

    // Validate pricing by recalculating on server side for security
    let serverPricing;
    try {
      serverPricing = calculateRentalPricing({
        bike,
        startDate,
        startTime,
        endDate,
        endTime,
        kmOption: bikeDetails.isUnlimited ? "unlimited" : "limited",
      });
    } catch (err) {
      throw new ApiError(`Pricing calculation error: ${err.message}`, 400);
    }

    // Validate that the frontend pricing matches server calculation (with tolerance for helmet charges)
    const expectedBaseTotal = serverPricing.breakdown.total;
    const frontendBaseTotal = priceDetails.totalAmount - (priceDetails.helmetCharges || 0);
    
    if (Math.abs(expectedBaseTotal - frontendBaseTotal) > 1) {
      console.log("Pricing mismatch:", {
        serverCalculated: expectedBaseTotal,
        frontendSent: frontendBaseTotal,
        difference: Math.abs(expectedBaseTotal - frontendBaseTotal)
      });
      throw new ApiError("Pricing mismatch detected. Please refresh and try again.", 400);
    }

    // Update bike availability
    bike.availableQuantity = bike.availableQuantity - 1;
    if (bike.availableQuantity <= 0) {
      bike.status = "booked";
    }
    await bike.save();

    // Create booking using the validated pricing details from frontend
    const booking = await Booking.create({
      user: req.user._id,
      bookingType: "bike",
      bike: bikeId,
      hotel: undefined,
      roomType: undefined,
      startDate,
      endDate,
      startTime,
      endTime,
      numberOfPeople: undefined,
      priceDetails: {
        ...priceDetails,
        // Use the pricing details sent from frontend after server-side validation
        extraAmount: priceDetails.extraCharges || 0,
        // Include GST percentage from server pricing calculation or frontend
        gstPercentage: priceDetails.gstPercentage || serverPricing.breakdown.gstPercentage || 5,
      },
      bikeDetails: {
        ...bikeDetails,
        helmetQuantity: requestedHelmets,
        helmetCharges: priceDetails.helmetCharges || 0,
      },
      hotelDetails: undefined,
      couponCode,
      specialRequests,
      guestDetails,
      bookingStatus: "pending",
    });

    // Send confirmation email & SMS
    const user = await User.findById(req.user._id).select("name email mobile");
    const gstPercentage = priceDetails.gstPercentage || serverPricing.breakdown.gstPercentage || 5;
    const emailMessage = `
      <h1>Bike Booking Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your bike booking has been confirmed.</p>
      <p>Booking ID: ${booking._id}</p>
      <p>Start: ${new Date(
        startDate + "T" + startTime + ":00"
      ).toLocaleString()}</p>
      <p>End: ${new Date(endDate + "T" + endTime + ":00").toLocaleString()}</p>
      <p>Helmets: ${requestedHelmets}</p>
      <p>Helmet Charges: ₹${(priceDetails.helmetCharges || 0).toFixed(2)}</p>
      <p>Extra Charges: ₹${(priceDetails.extraCharges || 0).toFixed(2)}</p>
      <p>GST (${gstPercentage}%): ₹${(priceDetails.taxes || 0).toFixed(2)}</p>
      <p>Total Amount: ₹${priceDetails.totalAmount.toFixed(2)}</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

    await sendEmail({
      email: user.email,
      subject: "HappyGo Bike Booking Confirmation",
      message: emailMessage,
    });

    return res.status(201).json({
      success: true,
      data: booking,
    });
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

    // Calculate total rooms needed based on room options
    const totalRoomsNeeded =
      (hotelDetails.roomOptions?.bedOnly?.quantity || 0) +
      (hotelDetails.roomOptions?.bedAndBreakfast?.quantity || 0) +
      (hotelDetails.roomOptions?.bedBreakfastAndDinner?.quantity || 0);

    // Check if enough rooms are available
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

    // Calculate total booked rooms
    let totalBookedRooms = 0;
    existingBookings.forEach((booking) => {
      if (booking.hotelDetails && booking.hotelDetails.roomOptions) {
        totalBookedRooms +=
          (booking.hotelDetails.roomOptions.bedOnly?.quantity || 0) +
          (booking.hotelDetails.roomOptions.bedAndBreakfast?.quantity || 0) +
          (booking.hotelDetails.roomOptions.bedBreakfastAndDinner?.quantity ||
            0);
      } else {
        // For backward compatibility with old bookings
        totalBookedRooms += 1;
      }
    });

    if (totalBookedRooms + totalRoomsNeeded > room.totalRooms) {
      throw new ApiError(
        `Only ${
          room.totalRooms - totalBookedRooms
        } rooms available for the selected dates`,
        400
      );
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
    guestDetails,
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

    // If bike booking is cancelled, increase available quantity
    if (booking.bookingType === "bike" && booking.bike) {
      const bike = await Bike.findById(booking.bike);
      if (bike) {
        bike.availableQuantity += 1;

        // Update status if needed
        if (bike.status === "booked" && bike.availableQuantity > 0) {
          bike.status = "available";
        }

        await bike.save();
      }
    }
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

// @desc    Extend bike booking
// @route   PUT /api/bookings/:id/extend
// @access  Private/Employee
export const extendBikeBooking = asyncHandler(async (req, res) => {
  const { newEndDate, newEndTime, reason } = req.body;

  if (!newEndDate || !newEndTime) {
    throw new ApiError("Please provide new end date and time", 400);
  }

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking is for bike
  if (booking.bookingType !== "bike") {
    throw new ApiError("Only bike bookings can be extended", 400);
  }

  // Check if booking is confirmed
  if (booking.bookingStatus !== "confirmed") {
    throw new ApiError("Only confirmed bookings can be extended", 400);
  }

  if (booking.user.toString() !== req.user._id.toString() && !req?.employee) {
    throw new ApiError("Not authorized to extend this booking", 401);
  }

  // Check if new end date is after current end date
  const currentEndDate = new Date(
    `${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`
  );
  const proposedEndDate = new Date(`${newEndDate}T${newEndTime}`);

  if (proposedEndDate <= currentEndDate) {
    throw new ApiError("New end date must be after current end date", 400);
  }

  // Check if bike is available for the extended period
  const bike = await Bike.findById(booking.bike);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Check for conflicting bookings in the extended period
  const conflictingBookings = await Booking.find({
    bookingType: "bike",
    bike: booking.bike,
    _id: { $ne: booking._id }, // Exclude current booking
    startDate: { $lte: proposedEndDate },
    endDate: { $gte: currentEndDate },
    bookingStatus: { $nin: ["cancelled"] },
  });

  if (conflictingBookings.length >= bike.availableQuantity) {
    console.log(
      "🚀 ~ extendBikeBooking ~ conflictingBookings:",
      conflictingBookings.length,
      bike.availableQuantity
    );
    throw new ApiError("Bike is not available for the extended period", 400);
  }

  // Calculate additional charges
  const currentDuration = Math.ceil(
    (currentEndDate - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  );
  const newDuration = Math.ceil(
    (proposedEndDate - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  );
  const additionalDays = newDuration - currentDuration;

  let additionalAmount = 0;

  if (booking.bikeDetails.isUnlimited) {
    additionalAmount = additionalDays * bike.pricePerDay.unlimited.price;
  } else {
    additionalAmount = additionalDays * bike.pricePerDay.limitedKm.price;
  }

  // Update booking
  booking.endDate = newEndDate;
  booking.endTime = newEndTime;

  // Update price details
  booking.priceDetails.basePrice += additionalAmount;
  booking.priceDetails.taxes = (booking.priceDetails.basePrice * 0.18).toFixed(
    2
  ); // Assuming 18% tax
  booking.priceDetails.totalAmount = (
    Number.parseFloat(booking.priceDetails.basePrice) +
    Number.parseFloat(booking.priceDetails.taxes) -
    Number.parseFloat(booking.priceDetails.discount || 0)
  ).toFixed(2);

  // Add extension note
  booking.extensionHistory = booking.extensionHistory || [];
  booking.extensionHistory.push({
    previousEndDate: booking.endDate,
    previousEndTime: booking.endTime,
    newEndDate,
    newEndTime,
    additionalAmount,
    reason,
    extendedBy: req?.employee?._id || req?.user?._id,
    extendedAt: new Date(),
  });

  await booking.save();

  // Send notification email to user
  const user = await User.findById(booking.user);

  if (user) {
    const emailMessage = `
      <h1>Booking Extension Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your bike booking (ID: ${booking._id}) has been extended.</p>
      <p>New End Date: ${new Date(
        newEndDate
      ).toLocaleDateString()} at ${newEndTime}</p>
      <p>Additional Amount: ₹${additionalAmount}</p>
      <p>New Total Amount: ₹${booking.priceDetails.totalAmount}</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

    await sendEmail({
      email: user.email,
      subject: "HappyGo Booking Extension Confirmation",
      message: emailMessage,
    });
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Complete bike booking
// @route   PUT /api/bookings/:id/complete
// @access  Private/Employee
export const completeBikeBooking = asyncHandler(async (req, res) => {
  const { finalKmReading, notes } = req.body;

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking is for bike
  if (booking.bookingType !== "bike") {
    throw new ApiError("Only bike bookings can be completed", 400);
  }

  // Check if booking is confirmed
  if (booking.bookingStatus !== "confirmed") {
    throw new ApiError("Only confirmed bookings can be completed", 400);
  }

  // Get bike
  const bike = await Bike.findById(booking.bike);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Check if booking is overdue
  const currentEndDate = new Date(
    `${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`
  );
  const now = new Date();
  const isOverdue = now > currentEndDate;

  // Calculate extra time if overdue
  let extraHours = 0;
  let extraDays = 0;
  let overdueCharges = 0;

  if (isOverdue) {
    const timeDiff = now - currentEndDate;
    extraHours = Math.ceil(timeDiff / (1000 * 60 * 60));
    extraDays = Math.ceil(extraHours / 24);

    // Calculate overdue charges (1.5x the daily rate)
    if (booking.bikeDetails.isUnlimited) {
      overdueCharges = (
        extraDays *
        bike.pricePerDay.unlimited.price *
        1.5
      ).toFixed(2);
    } else {
      overdueCharges = (
        extraDays *
        bike.pricePerDay.limitedKm.price *
        1.5
      ).toFixed(2);
    }
  }

  // Calculate additional km charges if applicable
  let kmCharges = 0;
  let additionalKm = 0; // Declare additionalKm here

  if (finalKmReading && !booking.bikeDetails.isUnlimited) {
    const initialKmReading = booking.bikeDetails.initialKmReading || 0;
    const kmTravelled = finalKmReading - initialKmReading;
    const kmLimit = booking.bikeDetails.kmLimit;

    additionalKm = Math.max(0, kmTravelled - kmLimit);

    if (additionalKm > 0) {
      kmCharges = (additionalKm * bike.additionalKmPrice).toFixed(2);
    }

    booking.bikeDetails.finalKmReading = finalKmReading;
  }

  // Update booking
  booking.bookingStatus = "completed";
  booking.completedAt = now;
  booking.completedBy = req.employee._id;

  if (notes) {
    booking.completionNotes = notes;
  }

  // Add overdue information if applicable
  if (isOverdue) {
    booking.overdueInfo = {
      extraHours,
      extraDays,
      overdueCharges,
      actualReturnDate: now,
    };
  }

  // Update additional charges
  booking.bikeDetails.additionalCharges = {
    amount: Number.parseFloat(overdueCharges) + Number.parseFloat(kmCharges),
    reason: `${
      isOverdue ? `Overdue by ${extraDays} days (₹${overdueCharges})` : ""
    } ${
      kmCharges > 0 ? `Additional ${additionalKm} km (₹${kmCharges})` : ""
    }`.trim(),
  };

  // Update total amount
  booking.priceDetails.totalAmount = (
    Number.parseFloat(booking.priceDetails.totalAmount) +
    Number.parseFloat(overdueCharges) +
    Number.parseFloat(kmCharges)
  ).toFixed(2);

  await booking.save();

  // Update bike availability
  bike.availableQuantity += 1;

  // Update status if needed
  if (bike.status === "booked" && bike.availableQuantity > 0) {
    bike.status = "available";
  }

  await bike.save();

  // Send completion email to user
  const user = await User.findById(booking.user);

  if (user) {
    const emailMessage = `
      <h1>Booking Completion Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your bike booking (ID: ${booking._id}) has been completed.</p>
      <p>Return Date: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}</p>
      ${
        isOverdue
          ? `<p>Your booking was overdue by ${extraDays} days. Overdue charges: ₹${overdueCharges}</p>`
          : ""
      }
      ${kmCharges > 0 ? `<p>Additional km charges: ₹${kmCharges}</p>` : ""}
      <p>Final Total Amount: ₹${booking.priceDetails.totalAmount}</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

    await sendEmail({
      email: user.email,
      subject: "HappyGo Booking Completion Confirmation",
      message: emailMessage,
    });
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Get employee bookings
// @route   GET /api/employee/bookings
// @access  Private/Employee
export const getEmployeeBookings = asyncHandler(async (req, res) => {
  const {
    type,
    status,
    startDate,
    endDate,
    limit = 10,
    page = 1,
    sort,
  } = req.query;

  // Build query
  const query = {};

  // Filter by type
  if (type && type !== "all") {
    query.bookingType = type.toLowerCase();
  }

  // Filter by status
  if (status && status !== "all") {
    query.bookingStatus = status.toLowerCase();
  }

  // Filter by date range
  if (startDate && endDate) {
    query.$or = [
      {
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(startDate) },
      },
    ];
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

  // Format bookings for frontend
  const formattedBookings = bookings.map((booking) => {
    return {
      id: booking._id,
      bookingType:
        booking.bookingType.charAt(0).toUpperCase() +
        booking.bookingType.slice(1),
      status:
        booking.bookingStatus.charAt(0).toUpperCase() +
        booking.bookingStatus.slice(1),
      paymentStatus:
        booking.paymentStatus.charAt(0).toUpperCase() +
        booking.paymentStatus.slice(1),
      startDate: booking.startDate,
      endDate: booking.endDate,
      createdAt: booking.createdAt,
      totalAmount: booking.priceDetails.totalAmount,
      customerName: booking.user?.name || "Unknown User",
      itemName:
        booking.bookingType === "bike"
          ? booking.bike?.title || "Bike"
          : booking.hotel?.name || "Hotel",
    };
  });

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: formattedBookings,
  });
});

// @desc    Get employee booking by ID
// @route   GET /api/employee/bookings/:id
// @access  Private/Employee
export const getEmployeeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: "bike",
      select:
        "title brand model images pricePerDay additionalKmPrice registrationNumber",
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

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Update booking status by employee
// @route   PUT /api/employee/bookings/:id/status
// @access  Private/Employee
export const updateEmployeeBookingStatus = asyncHandler(async (req, res) => {
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

  // Update booking
  booking.bookingStatus = status;
  booking.assignedEmployee = req.employee._id;

  if (status === "cancelled") {
    // If cancellation reason is provided, add it to the booking
    if (cancellationReason) {
      booking.cancellationReason = cancellationReason;
    }

    // If bike booking is cancelled, increase available quantity
    if (booking.bookingType === "bike" && booking.bike) {
      const bike = await Bike.findById(booking.bike);
      if (bike) {
        bike.availableQuantity += 1;

        // Update status if needed
        if (bike.status === "booked" && bike.availableQuantity > 0) {
          bike.status = "available";
        }

        await bike.save();
      }
    }
  }

  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// Add this new controller method for extending bookings
// Updated extendBooking controller with time support
export const extendBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { newEndDate, newEndTime } = req.body;

  if (!bookingId || !newEndDate) {
    throw new ApiError(400, "Booking ID and new end date are required");
  }

  if (!newEndTime) {
    throw new ApiError(400, "New end time is required");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Create date objects with time for comparison
  const currentEndDateTime = new Date(booking.endDate);
  if (booking.endTime) {
    const [hours, minutes] = booking.endTime.split(":").map(Number);
    currentEndDateTime.setHours(hours, minutes, 0);
  }

  // Parse the new end date and time
  const extendedEndDate = new Date(newEndDate);
  const [hours, minutes] = newEndTime.split(":").map(Number);
  extendedEndDate.setHours(hours, minutes, 0);

  if (extendedEndDate <= currentEndDateTime) {
    throw new ApiError(
      400,
      "New end date and time must be after current end date and time"
    );
  }

  // Check if the bike is already booked for the extended period
  console.log("🚀 ~ extendBooking ~ booking:", booking.bike, booking);
  const bike = await Bike.findById(booking.bike);
  console.log("🚀 ~ extendBooking ~ bike:", bike);
  if (!bike) {
    throw new ApiError(404, "Bike not found");
  }

  // Find any overlapping bookings
  const overlappingBookings = await Booking.find({
    bikeId: booking.bikeId,
    _id: { $ne: booking._id }, // Exclude current booking
    status: { $nin: ["cancelled", "rejected"] },
    startDate: { $lt: extendedEndDate },
    endDate: { $gt: currentEndDateTime },
  });

  if (overlappingBookings.length > 0) {
    throw new ApiError(
      400,
      "Cannot extend booking as bike is already booked for the requested period"
    );
  }

  // Calculate additional amount with more precision (including partial days)
  const startDateTime = new Date(booking.startDate);
  if (booking.startTime) {
    const [startHours, startMinutes] = booking.startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes, 0);
  }

  // Calculate duration in milliseconds and convert to days (including partial days)
  const originalDurationMs = currentEndDateTime - startDateTime;
  const newDurationMs = extendedEndDate - startDateTime;

  // Convert to days (including fractional days)
  const originalDuration = originalDurationMs / (1000 * 60 * 60 * 24);
  const newDuration = newDurationMs / (1000 * 60 * 60 * 24);
  const additionalDays = newDuration - originalDuration;

  // Calculate daily rate from original booking
  const dailyRate = booking.totalAmount / originalDuration;
  const additionalAmount = dailyRate * additionalDays;
  const newTotalAmount = booking.totalAmount + additionalAmount;

  // Update booking
  booking.endDate = newEndDate; // Store as date string
  booking.endTime = newEndTime; // Store time separately
  booking.totalAmount = newTotalAmount;
  booking.updatedAt = Date.now();

  // Add extension information to booking history
  if (!booking.history) {
    booking.history = [];
  }

  console.log("🚀 ~ extendBooking ~ req.user:", req.employee);
  booking.history.push({
    action: "extended",
    timestamp: Date.now(),
    details: `Booking extended to ${newEndDate} ${newEndTime}. Additional amount: ₹${additionalAmount.toFixed(
      2
    )}`,
    performedBy: req.employee._id,
  });

  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking extended successfully",
    booking,
    additionalAmount,
    newTotalAmount,
  });
});

// Modify the cancelBooking function to allow cancellation of confirmed bookings
export const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { cancellationReason } = req.body;

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Allow cancellation regardless of status for employees and admins
  // For regular users, we might want to keep restrictions
  if (req.user.role === "user" && booking.status !== "pending") {
    throw new ApiError(400, "Cannot cancel booking as it is already processed");
  }

  booking.status = "cancelled";
  booking.cancellationReason = cancellationReason || "Cancelled by employee";
  booking.updatedAt = Date.now();

  // Add cancellation to booking history
  if (!booking.history) {
    booking.history = [];
  }

  booking.history.push({
    action: "cancelled",
    timestamp: Date.now(),
    details: `Booking cancelled. Reason: ${
      cancellationReason || "Not provided"
    }`,
    performedBy: req.user._id,
  });

  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking cancelled successfully",
    booking,
  });
});

// Get helmet info
export const getHelmetInfo = asyncHandler(async (req, res) => {
  const helmet = await Helmet.findOne({ isActive: true });

  if (!helmet) {
    return res.status(404).json({
      success: false,
      message: "Helmet service not available",
    });
  }

  res.status(200).json({
    success: true,
    data: helmet,
  });
});

// Update helmet settings (Admin only)
export const updateHelmetSettings = asyncHandler(async (req, res) => {
  console.log(
    "🚀 ~ updateHelmetSettings ~ updateHelmetSettings:",
    updateHelmetSettings
  );
  const { totalQuantity, pricePerHelmet, freeHelmetPerBooking } = req.body;

  let helmet = await Helmet.findOne({ isActive: true });

  if (!helmet) {
    helmet = await Helmet.create({
      totalQuantity,
      availableQuantity: totalQuantity,
      pricePerHelmet: pricePerHelmet || 60,
      freeHelmetPerBooking: freeHelmetPerBooking || 1,
    });
  } else {
    helmet.totalQuantity = totalQuantity || helmet.totalQuantity;
    helmet.availableQuantity = totalQuantity || helmet.availableQuantity;
    helmet.pricePerHelmet = pricePerHelmet || helmet.pricePerHelmet;
    helmet.freeHelmetPerBooking =
      freeHelmetPerBooking || helmet.freeHelmetPerBooking;
    await helmet.save();
  }

  res.status(200).json({
    success: true,
    data: helmet,
  });
});

// Export the new controller methods
// module.exports = {
//   createBooking,
//   getBookings,
//   getBooking,
//   updateBookingStatus,
//   uploadDocuments,
//   calculateAdditionalCharges,
//   getHotelBookings,
//   getBikeBookings,
//   updateHotelBookingDetails,
//   getBookingStats,
//   extendBikeBooking,
//   completeBikeBooking,
//   getEmployeeBookings,
//   getEmployeeBooking,
//   updateEmployeeBookingStatus,
//   extendBooking,
//   cancelBooking,
// };
