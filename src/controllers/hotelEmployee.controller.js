import Hotel from "../models/hotel.model.js";
import Booking from "../models/booking.model.js";

/**
 * @desc    Get all hotels with computed totalRooms and availableRooms
 * @route   GET /api/employees/hotels
 * @access  Private (employeeProtect)
 */
export const getHotels = async (req, res) => {
  try {
    // Fetch all hotels (including their rooms subdocuments)
    const hotels = await Hotel.find({});

    // For each hotel, compute sum of totalRooms and availableRooms across all room types
    const data = hotels.map((hotel) => {
      let totalRooms = 0;
      let availableRooms = 0;

      hotel.rooms.forEach((room) => {
        totalRooms += room.totalRooms;
        availableRooms += room.availableRooms;
      });

      return {
        _id: hotel._id,
        name: hotel.name,
        location: hotel.location,
        totalRooms,
        availableRooms,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Server Error: could not fetch hotels." });
  }
};

/**
 * @desc    Get full details of a single hotel (hostel)
 * @route   GET /api/employees/hotels/:id
 * @access  Private (employeeProtect)
 */
export const getHotelById = async (req, res) => {
  try {
    const hotelId = req.params.id;
    const hotel = await Hotel.findById(hotelId).lean();

    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, error: "Hotel not found." });
    }

    // Compute totalRooms & availableRooms across all room types
    let totalRooms = 0;
    let availableRooms = 0;
    hotel.rooms.forEach((room) => {
      totalRooms += room.totalRooms;
      availableRooms += room.availableRooms;
    });

    return res.status(200).json({
      success: true,
      data: {
        ...hotel,
        computed: {
          totalRooms,
          availableRooms,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Server Error: could not fetch hotel." });
  }
};

/**
 * @desc    Update an existing hotel's details (e.g., availableRooms, totalRooms, amenities, etc.)
 * @route   PUT /api/employees/hotels/:id
 * @access  Private (employeeProtect)
 *
 * In the request body you can pass any updatable hotel fields:
 *   - name, description, location, address, images, amenities, guidelines, etc.
 *   - rooms: [ { _id, type, description, images, capacity, priceOptions, amenities, totalRooms, availableRooms } , … ]
 *   - isActive, ratings, …
 */
export const updateHotel = async (req, res) => {
  try {
    const hotelId = req.params.id;
    const updates = req.body;

    // If rooms array is being updated, ensure that sub‐documents are valid.
    // The simplest approach: use findByIdAndUpdate() with runValidators: true.
    const updatedHotel = await Hotel.findByIdAndUpdate(hotelId, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedHotel) {
      return res
        .status(404)
        .json({ success: false, error: "Hotel not found." });
    }

    // Recompute totalRooms/availableRooms after update
    let totalRooms = 0;
    let availableRooms = 0;
    updatedHotel.rooms.forEach((room) => {
      totalRooms += room.totalRooms;
      availableRooms += room.availableRooms;
    });

    return res.status(200).json({
      success: true,
      data: {
        ...updatedHotel,
        computed: { totalRooms, availableRooms },
      },
    });
  } catch (err) {
    console.error(err);
    // If Mongoose validation error:
    if (err.name === "ValidationError") {
      let messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(", ") });
    }
    return res
      .status(500)
      .json({ success: false, error: "Server Error: could not update hotel." });
  }
};

/**
 * @desc    Get all hotel‐type bookings (optionally can filter by hotel if passed via query)
 * @route   GET /api/employees/bookings      (to get all bookings)
 * @route   GET /api/employees/bookings?hotel=<hotelId>  (to filter by a specific hotel)
 * @access  Private (employeeProtect)
 */
export const getAllBookings = async (req, res) => {
  try {
    const { hotel: hotelId } = req.query;

    // Build filter: bookingType must be "hotel"
    const filter = { bookingType: "hotel" };
    if (hotelId) {
      filter.hotel = hotelId;
    }

    const bookings = await Booking.find(filter)
      .populate("user", "name email") // if you want caller’s info
      .populate("hotel", "name location") // hotel name & location
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Server Error: could not fetch bookings.",
    });
  }
};

/**
 * @desc    Extend a hotel booking
 * @route   PUT /api/employees/bookings/:id/extend
 * @access  Private (employeeProtect)
 *
 * Body should include:
 *   - newEndDate       (Date string or ISO format)
 *   - newEndTime       (e.g. "11:00 AM")
 *   - additionalAmount (Number)
 *   - reason           (String)
 */
export const extendBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { newEndDate, newEndTime, additionalAmount, reason } = req.body;
    const extendedBy = req.employee._id; // from employeeProtect

    // 1) Find existing booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, error: "Booking not found." });
    }

    if (booking.bookingType !== "hotel") {
      return res
        .status(400)
        .json({ success: false, error: "Cannot extend non‐hotel booking." });
    }

    // 2) Push previous values into extensionHistory
    booking.extensionHistory.push({
      previousEndDate: booking.endDate,
      previousEndTime: booking.endTime,
      newEndDate,
      newEndTime,
      additionalAmount,
      reason,
      extendedBy,
      extendedAt: Date.now(),
    });

    // 3) Update the booking's endDate / endTime
    booking.endDate = newEndDate;
    booking.endTime = newEndTime;

    // 4) Add the additionalAmount to priceDetails.totalAmount
    booking.priceDetails.totalAmount += Number(additionalAmount || 0);

    // 5) Save
    await booking.save();

    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError") {
      let messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(", ") });
    }
    return res.status(500).json({
      success: false,
      error: "Server Error: could not extend booking.",
    });
  }
};

/**
 * @desc    Check out (complete) a hotel booking:
 *           - Mark bookingStatus: "completed"
 *           - Set completedAt, completedBy
 *           - Increment the hotel's availableRooms for that room type
 * @route   PUT /api/employees/bookings/:id/checkout
 * @access  Private (employeeProtect)
 */
export const checkoutBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const completedBy = req.employee._id;

    // 1) Find the booking, ensure it is hotel type
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, error: "Booking not found." });
    }
    if (booking.bookingType !== "hotel") {
      return res
        .status(400)
        .json({ success: false, error: "Cannot checkout non‐hotel booking." });
    }
    if (booking.bookingStatus === "completed") {
      return res
        .status(400)
        .json({ success: false, error: "Booking is already completed." });
    }

    // 2) Update booking fields
    booking.bookingStatus = "completed";
    booking.completedAt = Date.now();
    booking.completedBy = completedBy;

    await booking.save();

    // 3) Increment the hotel's availableRooms on that room type
    const hotel = await Hotel.findById(booking.hotel);
    if (hotel) {
      // Find the room subdoc by roomType string
      const roomToUpdate = hotel.rooms.find((r) => r.type === booking.roomType);
      if (roomToUpdate) {
        // Each booking reserves one room regardless of numberOfPeople
        roomToUpdate.availableRooms = roomToUpdate.availableRooms + 1;
        // Cap it so it never exceeds totalRooms
        if (roomToUpdate.availableRooms > roomToUpdate.totalRooms) {
          roomToUpdate.availableRooms = roomToUpdate.totalRooms;
        }
        await hotel.save();
      }
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Server Error: could not checkout." });
  }
};

/**
 * @desc    Cancel a hotel booking (optional but recommended)
 *           - Mark bookingStatus: "cancelled"
 *           - If already completed or cancelled, reject
 *           - Optionally refund logic (not implemented here)
 * @route   PUT /api/employees/bookings/:id/cancel
 * @access  Private (employeeProtect)
 */
export const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, error: "Booking not found." });
    }
    if (booking.bookingType !== "hotel") {
      return res
        .status(400)
        .json({ success: false, error: "Cannot cancel non‐hotel booking." });
    }
    if (["cancelled", "completed"].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        error: `Booking is already ${booking.bookingStatus}.`,
      });
    }

    booking.bookingStatus = "cancelled";
    await booking.save();

    // Optionally increment availableRooms back:
    const hotel = await Hotel.findById(booking.hotel);
    if (hotel) {
      const roomToUpdate = hotel.rooms.find((r) => r.type === booking.roomType);
      if (roomToUpdate) {
        roomToUpdate.availableRooms = roomToUpdate.availableRooms + 1;
        if (roomToUpdate.availableRooms > roomToUpdate.totalRooms) {
          roomToUpdate.availableRooms = roomToUpdate.totalRooms;
        }
        await hotel.save();
      }
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Server Error: could not cancel booking.",
    });
  }
};
