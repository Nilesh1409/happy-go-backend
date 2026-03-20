import Hostel from "../models/hostel.model.js";
import Booking from "../models/booking.model.js";
import Cart from "../models/cart.model.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get all available hostels
// @route   GET /api/hostels/available
// @access  Public
export const getAvailableHostels = asyncHandler(async (req, res) => {
  const {
    checkIn,
    checkOut,
    people = 1,
    location = "Chikkamagaluru",
    isWorkstation = false,
  } = req.query;

  // Validate required fields
  if (!checkIn || !checkOut) {
    throw new ApiError(
      "Please provide check-in date and check-out date",
      400
    );
  }

  // Convert to Date objects
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const numberOfPeople = parseInt(people);

  // Validate dates
  if (checkInDate >= checkOutDate) {
    throw new ApiError("Check-in date must be before check-out date", 400);
  }

  // Check if dates are in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkInDate < today) {
    throw new ApiError("Check-in date cannot be in the past", 400);
  }

  // Build query
  const query = {
    isActive: true,
    location: new RegExp(location, "i"),
  };

  // Filter by workstation support if requested
  if (isWorkstation === "true" || isWorkstation === true) {
    query.supportsWorkstation = true;
  }

  const hostels = await Hostel.find(query);

  // console.log("all hostels", hostels.length);

  if (hostels.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      message: `No hostels found in ${location}`,
    });
  }

  // Find all bookings that overlap with the requested time period
  // Use strict inequality to allow same-day check-out/check-in
  // (e.g., check-out on Jan 28 at 10 AM, check-in on Jan 28 at 1 PM)
  const bookings = await Booking.find({
    bookingType: "hostel",
    $or: [
      {
        startDate: { $lt: checkOutDate },  // Existing booking starts before new check-out
        endDate: { $gt: checkInDate },     // Existing booking ends after new check-in
      },
    ],
    bookingStatus: { $nin: ["cancelled"] },
  }).select("hostel roomType numberOfBeds");

  // Group bookings by hostel and room type
  const bookedBeds = {};
  bookings.forEach((booking) => {
    const hostelId = booking.hostel?.toString();
    const roomType = booking.roomType;
    const bedsBooked = booking.numberOfBeds || 1;

    if (!hostelId || !roomType) return;

    if (!bookedBeds[hostelId]) {
      bookedBeds[hostelId] = {};
    }

    if (!bookedBeds[hostelId][roomType]) {
      bookedBeds[hostelId][roomType] = 0;
    }

    // Add the number of beds booked
    bookedBeds[hostelId][roomType] += bedsBooked;
  });

  // Calculate number of nights
  const nights = Math.ceil(
    (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
  );

  // Filter hostels with available rooms
  const availableHostels = hostels
    .map((hostel) => {
      const hostelObj = hostel.toObject();

      // Filter rooms based on availability and workstation requirements
      hostelObj.rooms = hostelObj.rooms
        .filter((room) => {
          // Filter by workstation requirements
          if (
            (isWorkstation === "true" || isWorkstation === true) &&
            !room.isWorkstationFriendly
          ) {
            return false;
          }

          // Check if room can accommodate the number of people
          if (room.capacity < numberOfPeople) {
            return false;
          }

          // Calculate number of booked beds for this room
          const hostelId = hostel._id.toString();
          const roomType = room.type;
          const bookedCount =
            bookedBeds[hostelId] && bookedBeds[hostelId][roomType]
              ? bookedBeds[hostelId][roomType]
              : 0;

          // Check if there are available beds
          const availableCount = room.totalBeds - bookedCount;
          
          // Add availability info to room
          room.availableBeds = Math.max(0, availableCount);
          room.bookedBeds = bookedCount;

          return availableCount > 0;
        })
        .map((room) => {
          // Calculate prices with discounts
          const bedOnlyPrice =
            room.mealOptions.bedOnly.discountedPrice ||
            room.mealOptions.bedOnly.basePrice;
          const bedBreakfastPrice =
            room.mealOptions.bedAndBreakfast.discountedPrice ||
            room.mealOptions.bedAndBreakfast.basePrice;
          const bedBreakfastDinnerPrice =
            room.mealOptions.bedBreakfastAndDinner.discountedPrice ||
            room.mealOptions.bedBreakfastAndDinner.basePrice;

          room.calculatedPricing = {
            bedOnly: {
              pricePerNight: bedOnlyPrice,
              totalPrice: bedOnlyPrice * nights,
              originalPrice: room.mealOptions.bedOnly.basePrice * nights,
              savings:
                room.mealOptions.bedOnly.basePrice > bedOnlyPrice
                  ? (room.mealOptions.bedOnly.basePrice - bedOnlyPrice) * nights
                  : 0,
              discountApplied: room.mealOptions.bedOnly.discountedPrice
                ? true
                : false,
            },
            bedAndBreakfast: {
              pricePerNight: bedBreakfastPrice,
              totalPrice: bedBreakfastPrice * nights,
              originalPrice: room.mealOptions.bedAndBreakfast.basePrice * nights,
              savings:
                room.mealOptions.bedAndBreakfast.basePrice > bedBreakfastPrice
                  ? (room.mealOptions.bedAndBreakfast.basePrice -
                      bedBreakfastPrice) *
                    nights
                  : 0,
              discountApplied: room.mealOptions.bedAndBreakfast.discountedPrice
                ? true
                : false,
            },
            bedBreakfastAndDinner: {
              pricePerNight: bedBreakfastDinnerPrice,
              totalPrice: bedBreakfastDinnerPrice * nights,
              originalPrice:
                room.mealOptions.bedBreakfastAndDinner.basePrice * nights,
              savings:
                room.mealOptions.bedBreakfastAndDinner.basePrice >
                bedBreakfastDinnerPrice
                  ? (room.mealOptions.bedBreakfastAndDinner.basePrice -
                      bedBreakfastDinnerPrice) *
                    nights
                  : 0,
              discountApplied: room.mealOptions.bedBreakfastAndDinner
                .discountedPrice
                ? true
                : false,
            },
          };

          return room;
        });

      // Add booking details
      hostelObj.bookingDetails = {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights: nights,
        guests: numberOfPeople,
        isWorkstation: isWorkstation === "true" || isWorkstation === true,
      };

      return hostelObj;
    })
    .filter((hostel) => hostel.rooms.length > 0);

  res.status(200).json({
    success: true,
    count: availableHostels.length,
    data: availableHostels,
    searchCriteria: {
      location,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      people: numberOfPeople,
      isWorkstation: isWorkstation === "true" || isWorkstation === true,
      nights: nights,
    },
  });
});

// @desc    Get single hostel by ID
// @route   GET /api/hostels/:id
// @access  Public
export const getHostel = asyncHandler(async (req, res) => {
  const { checkIn, checkOut } = req.query;
  
  const hostel = await Hostel.findById(req.params.id);

  if (!hostel) {
    throw new ApiError("Hostel not found", 404);
  }

  const hostelObj = hostel.toObject();

  // If dates are provided, calculate real-time availability for each room
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Find overlapping bookings for this hostel
    // Use strict inequality to allow same-day turnover
    const overlappingBookings = await Booking.find({
      bookingType: "hostel",
      hostel: hostel._id,
      $or: [
        {
          startDate: { $lt: checkOutDate },  // Existing starts before new check-out
          endDate: { $gt: checkInDate },     // Existing ends after new check-in
        },
      ],
      bookingStatus: { $nin: ["cancelled"] },
    }).select("roomType numberOfBeds");

    // Group booked beds by room type
    const bookedBedsByRoom = {};
    overlappingBookings.forEach((booking) => {
      const roomType = booking.roomType;
      const beds = booking.numberOfBeds || 1;
      bookedBedsByRoom[roomType] = (bookedBedsByRoom[roomType] || 0) + beds;
    });

    // Calculate available beds for each room
    hostelObj.rooms = hostelObj.rooms.map((room) => {
      const bookedCount = bookedBedsByRoom[room.type] || 0;
      const availableCount = room.totalBeds - bookedCount;
      
      return {
        ...room,
        availableBeds: Math.max(0, availableCount),
        bookedBeds: bookedCount,
      };
    });

    hostelObj.searchDates = {
      checkIn: checkInDate,
      checkOut: checkOutDate,
    };
  } else {
    // No dates provided - calculate current overall availability
    const allBookings = await Booking.find({
      bookingType: "hostel",
      hostel: hostel._id,
      bookingStatus: { $nin: ["cancelled", "completed"] },
    }).select("roomType numberOfBeds startDate endDate");

    // Group by room type (only count active bookings)
    const bookedBedsByRoom = {};
    const now = new Date();
    allBookings.forEach((booking) => {
      // Only count if booking is currently active or future
      if (new Date(booking.endDate) >= now) {
        const roomType = booking.roomType;
        const beds = booking.numberOfBeds || 1;
        bookedBedsByRoom[roomType] = (bookedBedsByRoom[roomType] || 0) + beds;
      }
    });

    hostelObj.rooms = hostelObj.rooms.map((room) => {
      const bookedCount = bookedBedsByRoom[room.type] || 0;
      const availableCount = room.totalBeds - bookedCount;
      
      return {
        ...room,
        availableBeds: Math.max(0, availableCount),
        bookedBeds: bookedCount,
      };
    });
  }

  res.status(200).json({
    success: true,
    data: hostelObj,
  });
});

// @desc    Create new hostel
// @route   POST /api/admin/hostels
// @access  Private/Admin
export const createHostel = asyncHandler(async (req, res) => {
  // Set availableBeds equal to totalBeds for each room
  if (req.body.rooms && Array.isArray(req.body.rooms)) {
    req.body.rooms = req.body.rooms.map((room) => ({
      ...room,
      availableBeds: room.totalBeds,
    }));
  }

  const hostel = await Hostel.create(req.body);

  res.status(201).json({
    success: true,
    message: "Hostel created successfully",
    data: hostel,
  });
});

// @desc    Update hostel
// @route   PUT /api/admin/hostels/:id
// @access  Private/Admin
export const updateHostel = asyncHandler(async (req, res) => {
  let hostel = await Hostel.findById(req.params.id);

  if (!hostel) {
    throw new ApiError("Hostel not found", 404);
  }

  hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Hostel updated successfully",
    data: hostel,
  });
});

// @desc    Delete hostel (soft delete by setting isActive to false)
// @route   DELETE /api/admin/hostels/:id
// @access  Private/Admin
export const deleteHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);

  if (!hostel) {
    throw new ApiError("Hostel not found", 404);
  }

  // Soft delete
  hostel.isActive = false;
  await hostel.save();

  res.status(200).json({
    success: true,
    message: "Hostel deactivated successfully",
    data: {},
  });
});

// @desc    Get all hostels for admin
// @route   GET /api/admin/hostels
// @access  Private/Admin
export const getAdminHostels = asyncHandler(async (req, res) => {
  const { search, limit = 10, page = 1, sort, isActive } = req.query;

  // Build query
  const query = {};

  // Search
  if (search) {
    query.$text = { $search: search };
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Count total documents
  const total = await Hostel.countDocuments(query);

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
  const hostels = await Hostel.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: hostels.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: hostels,
  });
});

// @desc    Get all hostel bookings for admin with filters
// @route   GET /api/admin/hostels/bookings
// @access  Private/Admin
export const getAdminHostelBookings = asyncHandler(async (req, res) => {
  const { 
    status, 
    paymentStatus, 
    hostelId, 
    startDate, 
    endDate,
    limit = 10, 
    page = 1, 
    sort 
  } = req.query;

  // Build query for hostel bookings only
  const query = { bookingType: "hostel" };

  // Filter by booking status
  if (status) {
    query.bookingStatus = status;
  }

  // Filter by payment status
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  // Filter by specific hostel
  if (hostelId) {
    query.hostel = hostelId;
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

  // Execute query with population
  const bookings = await Booking.find(query)
    .populate({
      path: "hostel",
      select: "name location images rooms ratings amenities",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .populate({
      path: "assignedEmployee",
      select: "name email mobile department",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  // Format bookings for response
  const formattedBookings = await Promise.all(
    bookings.map(async (booking) => {
      const bookingObj = booking.toObject();

      // Calculate nights
      const checkIn = new Date(booking.checkIn || booking.startDate);
      const checkOut = new Date(booking.checkOut || booking.endDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      // Add computed fields
      bookingObj.computed = {
        nights: nights,
        canCancel: 
          booking.bookingStatus === "pending" ||
          (booking.bookingStatus === "confirmed" && new Date() < checkIn),
        canModify:
          booking.bookingStatus === "confirmed" && new Date() < checkIn,
        isUpcoming: new Date() < checkIn,
        isActive: 
          booking.bookingStatus === "confirmed" && 
          new Date() >= checkIn && 
          new Date() <= checkOut,
        isPast: new Date() > checkOut,
        daysUntilCheckIn: Math.ceil((checkIn - new Date()) / (1000 * 60 * 60 * 24)),
      };

      // Calculate proportional paid amount for combined bookings
      let actualPaidAmount = booking.paymentDetails?.paidAmount || 0;
      let actualRemainingAmount = booking.paymentDetails?.remainingAmount || 0;
      let isCombinedBooking = false;

      if (booking.paymentGroupId) {
        isCombinedBooking = true;

        // Get all bookings in this payment group
        const relatedBookings = await Booking.find({
          paymentGroupId: booking.paymentGroupId,
        }).select("priceDetails paymentDetails");

        // Calculate combined total
        const combinedTotal = relatedBookings.reduce(
          (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
          0
        );

        // Get actual paid amount from payment history
        let totalPaidFromHistory = 0;
        const paymentHistory = booking.paymentDetails?.paymentHistory || [];
        
        for (const payment of paymentHistory) {
          if (payment.status === "completed") {
            totalPaidFromHistory += payment.amount || 0;
          }
        }

        // Calculate proportional amount for THIS booking
        const thisBookingTotal = booking.priceDetails?.totalAmount || 0;
        const proportion = thisBookingTotal / combinedTotal;
        actualPaidAmount = Math.round(totalPaidFromHistory * proportion);
        actualRemainingAmount = thisBookingTotal - actualPaidAmount;
      }

      // Payment summary
      bookingObj.paymentSummary = {
        status: booking.paymentStatus,
        totalAmount: booking.paymentDetails?.totalAmount || booking.priceDetails?.totalAmount || 0,
        paidAmount: actualPaidAmount,
        remainingAmount: actualRemainingAmount,
        paymentPercentage: booking.paymentDetails?.totalAmount 
          ? Math.round((actualPaidAmount / booking.paymentDetails.totalAmount) * 100)
          : 0,
        isPartialPayment: booking.paymentStatus === "partial",
        isFullyPaid: booking.paymentStatus === "completed",
        isCombined: isCombinedBooking,
        ...(isCombinedBooking && { paymentGroupId: booking.paymentGroupId }),
      };

      return bookingObj;
    })
  );

  // Calculate summary statistics
  const stats = {
    total: total,
    bookingsByStatus: {},
    bookingsByPaymentStatus: {},
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
  };

  // Get summary data
  const statusBreakdown = await Booking.aggregate([
    { $match: { bookingType: "hostel" } },
    {
      $group: {
        _id: "$bookingStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  statusBreakdown.forEach((item) => {
    stats.bookingsByStatus[item._id] = item.count;
  });

  const paymentBreakdown = await Booking.aggregate([
    { $match: { bookingType: "hostel" } },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$paymentDetails.totalAmount" },
        paidAmount: { $sum: "$paymentDetails.paidAmount" },
        remainingAmount: { $sum: "$paymentDetails.remainingAmount" },
      },
    },
  ]);

  paymentBreakdown.forEach((item) => {
    stats.bookingsByPaymentStatus[item._id] = {
      count: item.count,
      totalAmount: item.totalAmount,
      paidAmount: item.paidAmount,
      remainingAmount: item.remainingAmount,
    };
    stats.totalRevenue += item.totalAmount;
    stats.paidRevenue += item.paidAmount;
    stats.pendingRevenue += item.remainingAmount;
  });

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    stats,
    data: formattedBookings,
  });
});

// @desc    Get hostel booking statistics
// @route   GET /api/admin/hostels/bookings/stats
// @access  Private/Admin
export const getHostelBookingStats = asyncHandler(async (req, res) => {
  const { hostelId, startDate, endDate } = req.query;

  // Build base query
  const matchQuery = { bookingType: "hostel" };

  if (hostelId) {
    matchQuery.hostel = mongoose.Types.ObjectId(hostelId);
  }

  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Overall statistics
  const totalBookings = await Booking.countDocuments(matchQuery);

  // Bookings by status
  const statusBreakdown = await Booking.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$bookingStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  // Bookings by payment status
  const paymentStatusBreakdown = await Booking.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$paymentDetails.totalAmount" },
        paidAmount: { $sum: "$paymentDetails.paidAmount" },
        remainingAmount: { $sum: "$paymentDetails.remainingAmount" },
      },
    },
  ]);

  // Revenue statistics
  const revenueStats = await Booking.aggregate([
    { $match: { ...matchQuery, paymentStatus: { $in: ["partial", "completed"] } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$paymentDetails.totalAmount" },
        paidRevenue: { $sum: "$paymentDetails.paidAmount" },
        pendingRevenue: { $sum: "$paymentDetails.remainingAmount" },
        averageBookingValue: { $avg: "$paymentDetails.totalAmount" },
      },
    },
  ]);

  // Bookings by room type
  const roomTypeBreakdown = await Booking.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$roomType",
        count: { $sum: 1 },
        totalBeds: { $sum: "$numberOfBeds" },
        revenue: { $sum: "$paymentDetails.paidAmount" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Bookings by meal option
  const mealOptionBreakdown = await Booking.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$mealOption",
        count: { $sum: 1 },
        revenue: { $sum: "$paymentDetails.paidAmount" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Top hostels by bookings
  const topHostels = await Booking.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$hostel",
        bookingCount: { $sum: 1 },
        totalBeds: { $sum: "$numberOfBeds" },
        revenue: { $sum: "$paymentDetails.paidAmount" },
      },
    },
    { $sort: { bookingCount: -1 } },
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
        bookingCount: 1,
        totalBeds: 1,
        revenue: 1,
        name: "$hostelDetails.name",
        location: "$hostelDetails.location",
        image: { $arrayElemAt: ["$hostelDetails.images", 0] },
      },
    },
  ]);

  // Occupancy rate calculation
  const occupancyData = await Booking.aggregate([
    { $match: { ...matchQuery, bookingStatus: { $in: ["confirmed", "completed"] } } },
    {
      $group: {
        _id: null,
        totalBedsBooked: { $sum: "$numberOfBeds" },
        totalNights: { $sum: "$numberOfNights" },
      },
    },
  ]);

  // Monthly bookings trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyTrend = await Booking.aggregate([
    { 
      $match: { 
        ...matchQuery, 
        createdAt: { $gte: sixMonthsAgo } 
      } 
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        bookingCount: { $sum: 1 },
        revenue: { $sum: "$paymentDetails.paidAmount" },
        beds: { $sum: "$numberOfBeds" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalBookings,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      paymentStatusBreakdown: paymentStatusBreakdown.map((item) => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
        paidAmount: item.paidAmount,
        remainingAmount: item.remainingAmount,
      })),
      revenueStats: revenueStats[0] || {
        totalRevenue: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        averageBookingValue: 0,
      },
      roomTypeBreakdown,
      mealOptionBreakdown,
      topHostels,
      occupancyData: occupancyData[0] || {
        totalBedsBooked: 0,
        totalNights: 0,
      },
      monthlyTrend,
    },
  });
});

// @desc    Get single hostel booking details for admin
// @route   GET /api/admin/hostels/bookings/:id
// @access  Private/Admin
export const getAdminHostelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: "hostel",
      select: "name location images rooms ratings amenities contactInfo",
    })
    .populate({
      path: "user",
      select: "name email mobile createdAt",
    })
    .populate({
      path: "assignedEmployee",
      select: "name email mobile department role",
    });

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  if (booking.bookingType !== "hostel") {
    throw new ApiError("This is not a hostel booking", 400);
  }

  // Calculate additional details
  const checkIn = new Date(booking.checkIn || booking.startDate);
  const checkOut = new Date(booking.checkOut || booking.endDate);
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  const enhancedBooking = booking.toObject();

  enhancedBooking.computed = {
    nights: nights,
    canCancel: 
      booking.bookingStatus === "pending" ||
      (booking.bookingStatus === "confirmed" && new Date() < checkIn),
    canModify:
      booking.bookingStatus === "confirmed" && new Date() < checkIn,
    isUpcoming: new Date() < checkIn,
    isActive: 
      booking.bookingStatus === "confirmed" && 
      new Date() >= checkIn && 
      new Date() <= checkOut,
    isPast: new Date() > checkOut,
    daysUntilCheckIn: Math.ceil((checkIn - new Date()) / (1000 * 60 * 60 * 24)),
    daysUntilCheckOut: Math.ceil((checkOut - new Date()) / (1000 * 60 * 60 * 24)),
  };

  enhancedBooking.paymentSummary = {
    status: booking.paymentStatus,
    totalAmount: booking.paymentDetails?.totalAmount || booking.priceDetails?.totalAmount || 0,
    paidAmount: booking.paymentDetails?.paidAmount || 0,
    remainingAmount: booking.paymentDetails?.remainingAmount || 0,
    paymentPercentage: booking.paymentDetails?.totalAmount 
      ? Math.round((booking.paymentDetails.paidAmount / booking.paymentDetails.totalAmount) * 100)
      : 0,
    isPartialPayment: booking.paymentStatus === "partial",
    isFullyPaid: booking.paymentStatus === "completed",
    paymentHistory: booking.paymentDetails?.paymentHistory || [],
  };

  // Get room details from hostel
  if (booking.hostel && booking.roomType) {
    const room = booking.hostel.rooms.find((r) => r.type === booking.roomType);
    if (room) {
      enhancedBooking.roomDetails = {
        type: room.type,
        capacity: room.capacity,
        totalBeds: room.totalBeds,
        availableBeds: room.availableBeds,
        amenities: room.amenities,
        isWorkstationFriendly: room.isWorkstationFriendly,
        workstationAmenities: room.workstationAmenities,
      };
    }
  }

  res.status(200).json({
    success: true,
    data: enhancedBooking,
  });
});

export default {
  getAvailableHostels,
  getHostel,
  createHostel,
  updateHostel,
  deleteHostel,
  getAdminHostels,
  getAdminHostelBookings,
  getHostelBookingStats,
  getAdminHostelBooking,
};

