import Bike from "../models/bike.model.js";
import Booking from "../models/booking.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get all bikes
// @route   GET /api/bikes
// @access  Public
export const getBikes = asyncHandler(async (req, res) => {
  const { search, limit = 10, page = 1, sort, isTrending } = req.query;

  // Build query
  const query = {};

  // Search
  if (search) {
    query.$text = { $search: search };
  }

  // Filter by trending
  if (isTrending) {
    query.isTrending = isTrending === "true";
  }

  // Count total documents
  const total = await Bike.countDocuments(query);

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
  const bikes = await Bike.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: bikes.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: bikes,
  });
});

// @desc    Get trending bikes
// @route   GET /api/bikes/trending
// @access  Public
export const getTrendingBikes = asyncHandler(async (req, res) => {
  const bikes = await Bike.find({ isTrending: true }).limit(10);

  res.status(200).json({
    success: true,
    count: bikes.length,
    data: bikes,
  });
});

// @desc    Get single bike
// @route   GET /api/bikes/:id
// @access  Public
export const getBike = asyncHandler(async (req, res) => {
  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  res.status(200).json({
    success: true,
    data: bike,
  });
});

// @desc    Get available bikes
// @route   GET /api/bikes/available
// @access  Public
export const getAvailableBikes = asyncHandler(async (req, res) => {
  const { startDate, endDate, startTime, endTime, location } = req.query;

  // Validate required fields
  if (!startDate || !endDate || !startTime || !endTime) {
    throw new ApiError(
      "Please provide start date, end date, start time, and end time",
      400
    );
  }

  // Convert to Date objects
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  // Validate dates
  if (start >= end) {
    throw new ApiError("Start date must be before end date", 400);
  }

  // Find all bikes
  let bikes = await Bike.find({ isAvailable: true });

  // If location is provided, filter by location
  // if (location) {
  //   bikes = bikes.filter((bike) => bike.location.toLowerCase().includes(location.toLowerCase()))
  // }

  // Find all bookings that overlap with the requested time period
  const bookings = await Booking.find({
    bookingType: "bike",
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start },
      },
    ],
    bookingStatus: { $nin: ["cancelled"] },
  });

  // Get IDs of bikes that are already booked
  const bookedBikeIds = bookings.map((booking) => booking.bike.toString());

  // Filter out booked bikes
  const availableBikes = bikes.filter(
    (bike) => !bookedBikeIds.includes(bike._id.toString())
  );

  res.status(200).json({
    success: true,
    count: availableBikes.length,
    data: availableBikes,
  });
});

// @desc    Create new bike
// @route   POST /api/bikes
// @access  Private/Admin
export const createBike = asyncHandler(async (req, res) => {
  const bike = await Bike.create(req.body);

  res.status(201).json({
    success: true,
    data: bike,
  });
});

// @desc    Update bike
// @route   PUT /api/bikes/:id
// @access  Private/Admin
export const updateBike = asyncHandler(async (req, res) => {
  let bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  bike = await Bike.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: bike,
  });
});

// @desc    Delete bike
// @route   DELETE /api/bikes/:id
// @access  Private/Admin
export const deleteBike = asyncHandler(async (req, res) => {
  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  await bike.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
