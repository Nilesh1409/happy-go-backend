import Hotel from "../models/hotel.model.js";
import Booking from "../models/booking.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
export const getHotels = asyncHandler(async (req, res) => {
  const { search, limit = 10, page = 1, sort } = req.query;

  // Build query
  const query = {};

  // Search
  if (search) {
    query.$text = { $search: search };
  }

  // Count total documents
  const total = await Hotel.countDocuments(query);

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
  const hotels = await Hotel.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: hotels.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: hotels,
  });
});

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
export const getHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    throw new ApiError("Hotel not found", 404);
  }

  res.status(200).json({
    success: true,
    data: hotel,
  });
});

// @desc    Get available hotels
// @route   GET /api/hotels/available
// @access  Public
export const getAvailableHotels = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, people } = req.query;

  // Validate required fields
  if (!checkIn || !checkOut) {
    throw new ApiError(
      "Please provide check-in date, check-out date, and number of people",
      400
    );
  }

  // Convert to Date objects
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const numberOfPeople = Number.parseInt(people);

  // Validate dates
  if (checkInDate >= checkOutDate) {
    throw new ApiError("Check-in date must be before check-out date", 400);
  }

  // Find all hotels
  const hotels = await Hotel.find({ isActive: true });

  console.log("🚀 ~ getAvailableHotels ~ hotels:", hotels);
  // Find all bookings that overlap with the requested time period
  const bookings = await Booking.find({
    bookingType: "hotel",
    $or: [
      {
        startDate: { $lte: checkOutDate },
        endDate: { $gte: checkInDate },
      },
    ],
    bookingStatus: { $nin: ["cancelled"] },
  });

  // Group bookings by hotel and room type
  const bookedRooms = {};
  bookings.forEach((booking) => {
    const hotelId = booking.hotel.toString();
    const roomType = booking.roomType;

    if (!bookedRooms[hotelId]) {
      bookedRooms[hotelId] = {};
    }

    if (!bookedRooms[hotelId][roomType]) {
      bookedRooms[hotelId][roomType] = 0;
    }

    bookedRooms[hotelId][roomType]++;
  });

  // Filter hotels with available rooms
  const availableHotels = hotels
    .map((hotel) => {
      const hotelObj = hotel.toObject();

      // Filter rooms that can accommodate the number of people and have availability
      hotelObj.rooms = hotelObj.rooms.filter((room) => {
        // Check if room can accommodate the number of people
        if (room.capacity < numberOfPeople) {
          return false;
        }

        // Calculate number of booked rooms
        const hotelId = hotel._id.toString();
        const roomType = room.type;
        const bookedCount =
          bookedRooms[hotelId] && bookedRooms[hotelId][roomType]
            ? bookedRooms[hotelId][roomType]
            : 0;

        // Check if there are available rooms
        return room.totalRooms - bookedCount > 0;
      });

      // Update available rooms count
      hotelObj.rooms.forEach((room) => {
        const hotelId = hotel._id.toString();
        const roomType = room.type;
        const bookedCount =
          bookedRooms[hotelId] && bookedRooms[hotelId][roomType]
            ? bookedRooms[hotelId][roomType]
            : 0;

        room.availableRooms = room.totalRooms - bookedCount;
      });

      return hotelObj;
    })
    .filter((hotel) => hotel.rooms.length > 0);

  console.log(
    "🚀 ~ getAvailableHotels ~ availableHotels:",
    availableHotels,
    hotels
  );

  res.status(200).json({
    success: true,
    count: availableHotels.length,
    data: availableHotels,
  });
});

// @desc    Create new hotel
// @route   POST /api/hotels
// @access  Private/Admin
export const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create(req.body);

  res.status(201).json({
    success: true,
    data: hotel,
  });
});

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private/Admin
export const updateHotel = asyncHandler(async (req, res) => {
  let hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    throw new ApiError("Hotel not found", 404);
  }

  hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: hotel,
  });
});

// @desc    Delete hotel
// @route   DELETE /api/hotels/:id
// @access  Private/Admin
export const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    throw new ApiError("Hotel not found", 404);
  }

  await hotel.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
