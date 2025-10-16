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

// @desc    Get available hostels/hotels
// @route   GET /api/hostels/available
// @access  Public
export const getAvailableHostels = asyncHandler(async (req, res) => {
  const { 
    checkIn, 
    checkOut, 
    people = 1, 
    location = "Chikkamagaluru",
    stayType = "hostel" // hostel or workstation
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

  // Find hostels/hotels by location
  const query = { 
    isActive: true,
    location: new RegExp(location, 'i') // Case-insensitive location search
  };

  const hostels = await Hotel.find(query);

  if (hostels.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      message: `No hostels found in ${location}`,
    });
  }

  // Find all bookings that overlap with the requested time period
  const bookings = await Booking.find({
    bookingType: { $in: ["hotel", "hostel"] },
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

    // Count total beds/rooms booked
    if (booking.hotelDetails && booking.hotelDetails.roomOptions) {
      const roomOptions = booking.hotelDetails.roomOptions;
      bookedRooms[hotelId][roomType] += 
        (roomOptions.bedOnly?.quantity || 0) +
        (roomOptions.bedAndBreakfast?.quantity || 0) +
        (roomOptions.bedBreakfastAndDinner?.quantity || 0);
    } else {
      bookedRooms[hotelId][roomType] += 1;
    }
  });

  // Filter hostels with available rooms
  const availableHostels = hostels
    .map((hostel) => {
      const hostelObj = hostel.toObject();

      // Filter rooms based on stay type and availability
      hostelObj.rooms = hostelObj.rooms.filter((room) => {
        // Filter by stay type for workstation requirements
        if (stayType === "workstation" && !room.isWorkstationFriendly) {
          return false;
        }

        // Check if room can accommodate the number of people
        if (room.capacity < numberOfPeople) {
          return false;
        }

        // Calculate number of booked rooms
        const hotelId = hostel._id.toString();
        const roomType = room.type;
        const bookedCount =
          bookedRooms[hotelId] && bookedRooms[hotelId][roomType]
            ? bookedRooms[hotelId][roomType]
            : 0;

        // Check if there are available rooms
        const availableCount = room.totalRooms - bookedCount;
        room.availableRooms = Math.max(0, availableCount);
        
        return availableCount > 0;
      });

      // Calculate total nights
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      // Add calculated pricing for each room
      hostelObj.rooms.forEach((room) => {
        // Calculate prices with discounts
        const bedOnlyPrice = room.priceOptions.bedOnly.discountedPrice || room.priceOptions.bedOnly.basePrice;
        const bedBreakfastPrice = room.priceOptions.bedAndBreakfast.discountedPrice || room.priceOptions.bedAndBreakfast.basePrice;
        const bedBreakfastDinnerPrice = room.priceOptions.bedBreakfastAndDinner.discountedPrice || room.priceOptions.bedBreakfastAndDinner.basePrice;

        room.calculatedPricing = {
          bedOnly: {
            pricePerNight: bedOnlyPrice,
            totalPrice: bedOnlyPrice * nights,
            savings: room.priceOptions.bedOnly.basePrice > bedOnlyPrice ? 
              (room.priceOptions.bedOnly.basePrice - bedOnlyPrice) * nights : 0
          },
          bedAndBreakfast: {
            pricePerNight: bedBreakfastPrice,
            totalPrice: bedBreakfastPrice * nights,
            savings: room.priceOptions.bedAndBreakfast.basePrice > bedBreakfastPrice ? 
              (room.priceOptions.bedAndBreakfast.basePrice - bedBreakfastPrice) * nights : 0
          },
          bedBreakfastAndDinner: {
            pricePerNight: bedBreakfastDinnerPrice,
            totalPrice: bedBreakfastDinnerPrice * nights,
            savings: room.priceOptions.bedBreakfastAndDinner.basePrice > bedBreakfastDinnerPrice ? 
              (room.priceOptions.bedBreakfastAndDinner.basePrice - bedBreakfastDinnerPrice) * nights : 0
          }
        };
      });

      // Add booking details
      hostelObj.bookingDetails = {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights: nights,
        guests: numberOfPeople,
        stayType: stayType
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
      stayType,
      nights: Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
    },
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
