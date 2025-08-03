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
    const { bikes, helmetQuantity } = req.body;

    // Validate required fields
    if (
      !bikes ||
      !Array.isArray(bikes) ||
      bikes.length === 0 ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime
    ) {
      throw new ApiError(
        "Please provide bikes, startDate, endDate, startTime, and endTime",
        400
      );
    }

    let totalBasePrice = 0;
    let totalDiscount = 0;
    let totalBikesCount = 0;
    const bookingBikesData = [];
    const bikeQuantitiesToUpdate = {};

    const startRequested = new Date(`${startDate}T${startTime}:00`);
    const endRequested = new Date(`${endDate}T${endTime}:00`);

    // 1. Validate each bike and calculate price
    for (const item of bikes) {
      const { bikeId, quantity, kmOption } = item;
      if (!bikeId || !quantity || !kmOption) {
        throw new ApiError("Each bike item must have bikeId, quantity, and kmOption", 400);
      }

      const bike = await Bike.findById(bikeId);
      if (!bike) {
        throw new ApiError(`Bike with ID ${bikeId} not found`, 404);
      }

      // Check availability
      const overlappingBookings = await Booking.find({
        bookingType: "bike",
        bookingStatus: { $in: ["confirmed", "pending"] },
        startDate: { $lte: endRequested },
        endDate: { $gte: startRequested },
        "bikes.bike": bikeId,
      });

      let alreadyBookedCount = 0;
      overlappingBookings.forEach((booking) => {
        booking.bikes.forEach((b) => {
          if (b.bike.toString() === bikeId) {
            alreadyBookedCount += b.quantity;
          }
        });
      });

      if (alreadyBookedCount + quantity > bike.quantity) {
        throw new ApiError(
          `Not enough units for ${bike.title}. Only ${
            bike.quantity - alreadyBookedCount
          } available.`,
          400
        );
      }

      // Calculate pricing for one unit
      const pricing = await calculateRentalPricing({
        bike,
        startDate,
        startTime,
        endDate,
        endTime,
        kmOption,
      });

      // Add price for all units of this bike to total
      totalBasePrice += pricing.totalPrice * quantity;
      totalBikesCount += quantity;

      bookingBikesData.push({
        bike: bikeId,
        quantity,
        kmOption,
        kmLimit: bike.pricePerDay[pricing.isWeekendBooking ? 'weekend' : 'weekday'][kmOption].kmLimit,
        additionalKmPrice: bike.additionalKmPrice,
      });

      // Track how much to decrement availableQuantity
      bikeQuantitiesToUpdate[bikeId] = (bikeQuantitiesToUpdate[bikeId] || 0) + quantity;
    }

    // 2. Calculate bulk booking discount
    // Note: The discount logic is complex as per the request.
    // This is a simplified interpretation where the discount is on the total price.
    let discountPercentage = 0;
    if (totalBikesCount === 2) discountPercentage = 0.02; // 2% discount
    else if (totalBikesCount >= 3 && totalBikesCount <= 4) discountPercentage = 0.04; // 4% discount
    else if (totalBikesCount >= 5) discountPercentage = 0.10; // 10% discount

    totalDiscount = totalBasePrice * discountPercentage;

    // 3. Calculate helmet charges
    let helmetCharges = 0;
    if (helmetQuantity > 0) {
      const helmet = await Helmet.findOne({ isActive: true });
      if (helmet) {
        // You might want to add helmet availability check here as well
        helmetCharges = Math.max(0, helmetQuantity - helmet.freeHelmetPerBooking) * helmet.pricePerHelmet;
      }
    }

    // 4. Final price calculation
    const subtotal = totalBasePrice - totalDiscount;
    const gstPercentage = 5;
    const taxes = (subtotal + helmetCharges) * (gstPercentage / 100);
    const finalTotalAmount = subtotal + taxes + helmetCharges;

    // 5. Create the booking
    const booking = await Booking.create({
      user: req.user._id,
      bookingType: "bike",
      bikes: bookingBikesData,
      startDate,
      endDate,
      startTime,
      endTime,
      priceDetails: {
        basePrice: totalBasePrice,
        discount: totalDiscount,
        helmetCharges,
        taxes,
        gstPercentage,
        totalAmount: finalTotalAmount,
      },
      helmetQuantity,
      documentsSubmitted,
      couponCode,
      specialRequests,
      guestDetails,
      bookingStatus: "pending",
    });

    // 6. Update bike quantities
    for (const [bikeId, quantity] of Object.entries(bikeQuantitiesToUpdate)) {
      await Bike.findByIdAndUpdate(bikeId, { $inc: { availableQuantity: -quantity } });
    }

    // 7. Send confirmation email
    const user = await User.findById(req.user._id).select("name email mobile");
    // Email content needs to be updated to show multiple bikes
    const emailMessage = `
      <h1>Bike Booking Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your bike booking for ${totalBikesCount} bike(s) has been confirmed.</p>
      <p>Booking ID: ${booking._id}</p>
      <p>Total Amount: ₹${finalTotalAmount.toFixed(2)}</p>
      ${totalDiscount > 0 ? `<p>You saved ₹${totalDiscount.toFixed(2)} with bulk booking!</p>`: ''}
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
      path: "bikes.bike",
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
      path: "bikes.bike",
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

    // If bike booking is cancelled, increase available quantity for each bike
    if (booking.bookingType === "bike" && booking.bikes && booking.bikes.length > 0) {
      for (const item of booking.bikes) {
        await Bike.findByIdAndUpdate(item.bike, {
          $inc: { availableQuantity: item.quantity },
        });
        // Note: The logic to update bike 'status' from 'booked' to 'available'
        // becomes more complex as it depends on total availability, not just this one booking.
        // A simpler approach is to handle status updates in a separate job or ensure
        // availableQuantity is the source of truth. For now, we'll just update the quantity.
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
  booking.documentsSubmitted = {
    idProof: idProof || booking.documentsSubmitted?.idProof,
    drivingLicense:
      drivingLicense || booking.documentsSubmitted?.drivingLicense,
    addressProof:
      addressProof || booking.documentsSubmitted?.addressProof,
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
      path: "bikes.bike",
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
  throw new ApiError("Booking extension is temporarily disabled.", 501);
  // TODO: Refactor this function to support multi-bike bookings.
  // This requires significant changes to handle availability checks and
  // pricing calculations for multiple bikes in a single booking.
});

// @desc    Complete bike booking
// @route   PUT /api/bookings/:id/complete
// @access  Private/Employee
export const completeBikeBooking = asyncHandler(async (req, res) => {
  const { readings, notes } = req.body; // readings: [{ bikeId, finalKmReading, initialKmReading }]

  const booking = await Booking.findById(req.params.id).populate("bikes.bike");

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }
  if (booking.bookingType !== "bike") {
    throw new ApiError("Only bike bookings can be completed", 400);
  }
  if (booking.bookingStatus !== "confirmed") {
    throw new ApiError("Only confirmed bookings can be completed", 400);
  }

  const now = new Date();
  const isOverdue = now > new Date(`${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`);
  let overdueCharges = 0;
  let extraDays = 0;
  const allReasons = [];

  if (isOverdue) {
    const timeDiff = now - new Date(`${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`);
    extraDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    // Overdue charges are complex with multiple bikes with different prices.
    // We'll calculate an average daily rate for simplicity.
    const avgDailyRate = booking.priceDetails.basePrice / (Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)));
    overdueCharges = extraDays * avgDailyRate * 1.5; // 1.5x penalty
    booking.overdueInfo = {
      extraHours: Math.ceil(timeDiff / (1000 * 60 * 60)),
      extraDays,
      overdueCharges,
      actualReturnDate: now,
    };
    allReasons.push(`Overdue by ${extraDays} days (₹${overdueCharges.toFixed(2)})`);
  }

  let totalKmCharges = 0;
  if (readings && Array.isArray(readings)) {
    for (const reading of readings) {
      const bikeInBooking = booking.bikes.find(b => b.bike._id.toString() === reading.bikeId);
      if (bikeInBooking) {
        bikeInBooking.initialKmReading = reading.initialKmReading;
        bikeInBooking.finalKmReading = reading.finalKmReading;

        if (bikeInBooking.kmOption === "limited") {
          const kmTravelled = reading.finalKmReading - reading.initialKmReading;
          const additionalKm = Math.max(0, kmTravelled - bikeInBooking.kmLimit);
          if (additionalKm > 0) {
            const kmCharges = additionalKm * bikeInBooking.additionalKmPrice;
            totalKmCharges += kmCharges;
            const reason = `Bike ${bikeInBooking.bike.title}: Exceeded km limit by ${additionalKm} km (₹${kmCharges.toFixed(2)})`;
            allReasons.push(reason);
            bikeInBooking.additionalCharges = { amount: kmCharges, reason };
          }
        }
      }
    }
  }

  booking.bookingStatus = "completed";
  booking.completedAt = now;
  booking.completedBy = req.employee._id;
  booking.completionNotes = `${notes || ""}\n${allReasons.join("; ")}`.trim();
  booking.priceDetails.totalAmount =
    Number.parseFloat(booking.priceDetails.totalAmount) +
    overdueCharges +
    totalKmCharges;

  await booking.save();

  // Update bike availability
  for (const item of booking.bikes) {
    await Bike.findByIdAndUpdate(item.bike._id, { $inc: { availableQuantity: item.quantity } });
  }

  const user = await User.findById(booking.user);
  if (user) {
    const emailMessage = `<h1>Booking Completion Confirmation</h1><p>Dear ${user.name},</p><p>Your bike booking (ID: ${booking._id}) has been completed.</p><p>Final Total Amount: ₹${booking.priceDetails.totalAmount.toFixed(2)}</p><p>Thank you for choosing HappyGo!</p>`;
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
      path: "bikes.bike",
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
          ? booking.bikes?.map((b) => `${b.bike.title} (x${b.quantity})`).join(", ") || "Bike"
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
      path: "bikes.bike",
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

    // If bike booking is cancelled, increase available quantity for each bike
    if (booking.bookingType === "bike" && booking.bikes && booking.bikes.length > 0) {
      for (const item of booking.bikes) {
        await Bike.findByIdAndUpdate(item.bike, {
          $inc: { availableQuantity: item.quantity },
        });
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
  throw new ApiError("Booking extension is temporarily disabled.", 501);
  // TODO: Refactor this function to support multi-bike bookings.
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

  // If bike booking is cancelled, increase available quantity for each bike
  if (booking.bookingType === "bike" && booking.bikes && booking.bikes.length > 0) {
    for (const item of booking.bikes) {
      await Bike.findByIdAndUpdate(item.bike, {
        $inc: { availableQuantity: item.quantity },
      });
    }
  }

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
