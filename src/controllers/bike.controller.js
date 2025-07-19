import Bike from "../models/bike.model.js";
import Booking from "../models/booking.model.js";
import helmet from "../models/helmet.model.js";
import Helmet from "../models/helmet.model.js";
import BikeMaintenance from "../models/bikeMaintenance.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteFromS3, processAndUploadImages } from "../utils/s3.js";
import {
  calculateExtraAmount,
  calculateRentalPricing,
} from "../utils/bikePricing.js";

// @desc    Get all bikes
// @route   GET /api/bikes
// @access  Public
// export const getBikes = asyncHandler(async (req, res) => {
//   const {
//     search,
//     limit = 10,
//     page = 1,
//     sort,
//     isTrending,
//     location,
//     brand,
//     minPrice,
//     maxPrice,
//   } = req.query;

//   // Build query
//   const query = {};

//   // Search
//   if (search) {
//     query.$text = { $search: search };
//   }

//   // Filter by trending
//   if (isTrending) {
//     query.isTrending = isTrending === "true";
//   }

//   // Filter by location
//   if (location) {
//     query.location = { $regex: location, $options: "i" };
//   }

//   // Filter by brand
//   if (brand) {
//     query.brand = { $regex: brand, $options: "i" };
//   }

//   // Filter by price range
//   if (minPrice || maxPrice) {
//     query.$or = [];

//     const priceFilter = {};
//     if (minPrice) priceFilter.$gte = Number(minPrice);
//     if (maxPrice) priceFilter.$lte = Number(maxPrice);

//     if (Object.keys(priceFilter).length > 0) {
//       query.$or.push({ "pricePerDay.limitedKm.price": priceFilter });
//       query.$or.push({ "pricePerDay.unlimited.price": priceFilter });
//     }
//   }

//   // Count total documents
//   const total = await Bike.countDocuments(query);

//   // Build sort options
//   let sortOptions = {};
//   if (sort) {
//     const sortFields = sort.split(",");
//     sortFields.forEach((field) => {
//       const sortOrder = field.startsWith("-") ? -1 : 1;
//       const fieldName = field.startsWith("-") ? field.substring(1) : field;
//       sortOptions[fieldName] = sortOrder;
//     });
//   } else {
//     sortOptions = { createdAt: -1 };
//   }

//   // Pagination
//   const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

//   // Execute query
//   const bikes = await Bike.find(query)
//     .sort(sortOptions)
//     .skip(skip)
//     .limit(Number.parseInt(limit));

//   res.status(200).json({
//     success: true,
//     count: bikes.length,
//     total,
//     page: Number.parseInt(page),
//     pages: Math.ceil(total / Number.parseInt(limit)),
//     data: bikes,
//   });
// });

// @desc    Get trending bikes with pricing calculations and price filtering
// @route   GET /api/bikes/trending?minPrice=0&maxPrice=500&kmOption=limited
// @access  Public
export const getTrendingBikes = asyncHandler(async (req, res) => {
  const { minPrice, maxPrice, kmOption = "limited" } = req.query;

  // Validate price parameters
  if (minPrice && isNaN(Number(minPrice))) {
    throw new ApiError("Invalid minPrice parameter", 400);
  }
  if (maxPrice && isNaN(Number(maxPrice))) {
    throw new ApiError("Invalid maxPrice parameter", 400);
  }
  if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
    throw new ApiError("minPrice cannot be greater than maxPrice", 400);
  }
  if (!["limited", "unlimited"].includes(kmOption)) {
    throw new ApiError("kmOption must be either 'limited' or 'unlimited'", 400);
  }
  // Calculate smart default dates and times using Indian Standard Time (IST)
  const getDefaultSearchPeriod = () => {
    // Get current time in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    
    // Get current IST hour and minute
    const currentHour = istTime.getUTCHours();
    const currentMinute = istTime.getUTCMinutes();
    
    let startDate = new Date(istTime);
    let startHour, startMinute;
    
    // Business logic for start time calculation
    if (currentHour < 8) {
      // If before 8am IST, start at 8am today
      startHour = 8;
      startMinute = 0;
    } else if (currentHour >= 19 && currentMinute >= 30) {
      // If 7:30pm IST or later, move to next day at 8am
      startDate.setUTCDate(startDate.getUTCDate() + 1);
      startHour = 8;
      startMinute = 0;
    } else {
      // Round up to next 30-minute block, ensuring it's greater than current time
      let nextHour = currentHour;
      let nextMinute;
      
      if (currentMinute < 30) {
        nextMinute = 30;
      } else {
        nextHour = currentHour + 1;
        nextMinute = 0;
      }
      
      // If the calculated time is not greater than current time, move to next slot
      if (nextHour === currentHour && nextMinute <= currentMinute) {
        if (nextMinute === 30) {
          nextHour = currentHour + 1;
          nextMinute = 0;
        } else {
          nextMinute = 30;
        }
      }
      
      startHour = nextHour;
      startMinute = nextMinute;
    }
    
    // End date is same as start date, end time is always 8pm (20:00)
    let endDate = new Date(startDate);
    const endHour = 20;
    const endMinute = 0;
    
    // Convert back to local dates for API response (YYYY-MM-DD format)
    const startDateStr = startDate.getUTCFullYear() + '-' + 
                        String(startDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                        String(startDate.getUTCDate()).padStart(2, '0');
    
    const endDateStr = endDate.getUTCFullYear() + '-' + 
                      String(endDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                      String(endDate.getUTCDate()).padStart(2, '0');
    
    // Format times as HH:mm
    const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
    
    return {
      startDate: startDateStr,
      endDate: endDateStr,
      startTime: startTimeStr,
      endTime: endTimeStr
    };
  };

  const { startDate, endDate, startTime, endTime } = getDefaultSearchPeriod();
  
  // Get trending bikes
  const bikes = await Bike.find({ isTrending: true }).limit(10);

  // Build Date objects for requested period
  const startRequested = new Date(`${startDate}T${startTime}:00`);
  const endRequested = new Date(`${endDate}T${endTime}:00`);

  // Helper function to check if it's weekend (Friday=5, Saturday=6, Sunday=0, Monday=1)
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 1 || day === 5 || day === 6; // Sunday, Monday, Friday, Saturday
  };

  // Check if the booking period includes any weekend days
  const isBookingDuringWeekend = () => {
    const current = new Date(startRequested);
    while (current <= endRequested) {
      if (isWeekend(current)) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  };

  const bookingIncludesWeekend = isBookingDuringWeekend();

  // Load bookings that overlap with the requested period
  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  const rawBookings = await Booking.find({
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed"] },
    startDate: { $lte: endDateOnly },
    endDate: { $gte: startDateOnly },
  });

  // Group bookings by bike and filter for true date+time overlap
  const bookingsByBike = rawBookings.reduce((map, bk) => {
    const bStart = new Date(bk.startDate);
    const [sh, sm] = bk.startTime.split(":").map(Number);
    bStart.setHours(sh, sm, 0, 0);

    const bEnd = new Date(bk.endDate);
    const [eh, em] = bk.endTime.split(":").map(Number);
    bEnd.setHours(eh, em, 0, 0);

    // Inclusive overlap check
    if (bStart <= endRequested && bEnd >= startRequested) {
      const id = bk.bike.toString();
      map[id] = map[id] || [];
      map[id].push({ start: bStart, end: bEnd });
    }
    return map;
  }, {});

  // Process each trending bike with pricing and availability
  const result = bikes.map((bike) => {
    const id = bike._id.toString();
    const total = bike.quantity;
    const overlappingBookings = bookingsByBike[id] || [];
    const count = overlappingBookings.length;

    // Create a modified bike object with weekend pricing logic
    const bikeObject = bike.toObject();

    // Modify limitedKm.isActive based on weekend check
    if (bookingIncludesWeekend) {
      bikeObject.pricePerDay.limitedKm.isActive = false;
    }

    // Calculate pricing for both limited and unlimited options
    let priceLimited = null;
    let priceUnlimited = null;

    try {
      // Calculate limited km pricing (if active and not weekend)
      if (bikeObject.pricePerDay?.limitedKm?.isActive) {
        try {
          const limitedPricing = calculateRentalPricing({
            bike: bikeObject,
            startDate,
            startTime,
            endDate,
            endTime,
            kmOption: "limited",
          });
          priceLimited = {
            totalPrice: limitedPricing.totalPrice,
            breakdown: limitedPricing.breakdown,
            isWeekendBooking: limitedPricing.isWeekendBooking,
          };
        } catch (err) {
          console.log(`Limited pricing calculation failed for trending bike ${bike._id}:`, err.message);
          priceLimited = null;
        }
      }

      // Calculate unlimited km pricing (if active)
      if (bikeObject.pricePerDay?.unlimited?.isActive) {
        try {
          const unlimitedPricing = calculateRentalPricing({
            bike: bikeObject,
            startDate,
            startTime,
            endDate,
            endTime,
            kmOption: "unlimited",
          });
          priceUnlimited = {
            totalPrice: unlimitedPricing.totalPrice,
            breakdown: unlimitedPricing.breakdown,
            isWeekendBooking: unlimitedPricing.isWeekendBooking,
          };
        } catch (err) {
          console.log(`Unlimited pricing calculation failed for trending bike ${bike._id}:`, err.message);
          priceUnlimited = null;
        }
      }
    } catch (error) {
      console.log(`Pricing calculation error for trending bike ${bike._id}:`, error.message);
    }

    return {
      ...bikeObject,
      isAvailable: count < total,
      availableUnits: Math.max(0, total - count),
      // Add pricing calculations
      priceLimited,
      priceUnlimited,
      defaultSearchPeriod: {
        startDate,
        endDate,
        startTime,
        endTime,
      },
    };
  });

  // Apply price filtering if minPrice or maxPrice is provided
  let filteredResult = result;
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    filteredResult = result.filter((bike) => {
      // Determine which pricing to use for filtering
      let priceToCheck = null;
      
      // First, try to use the preferred kmOption
      if (kmOption === "limited" && bike.priceLimited) {
        priceToCheck = bike.priceLimited.totalPrice;
      } else if (kmOption === "unlimited" && bike.priceUnlimited) {
        priceToCheck = bike.priceUnlimited.totalPrice;
      } else {
        // Fallback: use whichever option is available
        if (bike.priceLimited) {
          priceToCheck = bike.priceLimited.totalPrice;
        } else if (bike.priceUnlimited) {
          priceToCheck = bike.priceUnlimited.totalPrice;
        }
      }
      
      // If no pricing is available, exclude from results
      if (priceToCheck === null) {
        return false;
      }
      
      // Apply price range filtering
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Infinity;
      
      return priceToCheck >= min && priceToCheck <= max;
    });
  }

  res.status(200).json({
    success: true,
    count: filteredResult.length,
    data: filteredResult,
    defaultSearchPeriod: {
      startDate,
      endDate,
      startTime,
      endTime,
    },
    filters: {
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      kmOption,
      appliedFilters: minPrice !== undefined || maxPrice !== undefined,
    },
  });
});

// @desc    Get single bike
// @route   GET /api/bikes/:id
// @access  Public
// export const getBike = asyncHandler(async (req, res) => {
//   const bike = await Bike.findById(req.params.id);

//   if (!bike) {
//     throw new ApiError("Bike not found", 404);
//   }

//   res.status(200).json({
//     success: true,
//     data: bike,
//   });
// });

// @desc    Get available bikes with pricing calculations for both limited and unlimited km options
// @route   GET /api/bikes/available
// @access  Public
export const getAvailableBikes = asyncHandler(async (req, res) => {
  const { startDate, endDate, startTime, endTime, location } = req.query;

  // 1. Validate required fields
  if (!startDate || !endDate || !startTime || !endTime) {
    throw new ApiError(
      "Please provide start date, end date, start time, and end time",
      400
    );
  }

  // 2. Build Date objects for requested period
  const startRequested = new Date(`${startDate}T${startTime}:00`);
  const endRequested = new Date(`${endDate}T${endTime}:00`);
  if (isNaN(startRequested) || isNaN(endRequested)) {
    throw new ApiError("Invalid date or time format", 400);
  }
  if (startRequested >= endRequested) {
    throw new ApiError("Start date/time must be before end date/time", 400);
  }

  // Helper function to check if it's weekend (Friday=5, Saturday=6, Sunday=0, Monday=1)
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 1 || day === 5 || day === 6; // Sunday, Monday, Friday, Saturday
  };

  // Check if the booking period includes any weekend days
  const isBookingDuringWeekend = () => {
    const current = new Date(startRequested);
    while (current <= endRequested) {
      if (isWeekend(current)) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  };

  const bookingIncludesWeekend = isBookingDuringWeekend();

  // 3. Load all active bikes with optional location filter
  const bikeQuery = {
    isAvailable: true,
    status: { $ne: "unavailable" },
  };
  const bikes = await Bike.find(bikeQuery);

  // 4. Load bookings that overlap with the requested period
  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  const rawBookings = await Booking.find({
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed"] },
    startDate: { $lte: endDateOnly },
    endDate: { $gte: startDateOnly },
  });

  // 5. Group bookings by bike and filter for true date+time overlap
  const bookingsByBike = rawBookings.reduce((map, bk) => {
    const bStart = new Date(bk.startDate);
    const [sh, sm] = bk.startTime.split(":").map(Number);
    bStart.setHours(sh, sm, 0, 0);

    const bEnd = new Date(bk.endDate);
    const [eh, em] = bk.endTime.split(":").map(Number);
    bEnd.setHours(eh, em, 0, 0);

    // Inclusive overlap check
    if (bStart <= endRequested && bEnd >= startRequested) {
      const id = bk.bike.toString();
      map[id] = map[id] || [];
      map[id].push({ start: bStart, end: bEnd });
    }
    return map;
  }, {});

  // 6. Process each bike and determine availability with pricing
  const result = bikes.map((bike) => {
    const id = bike._id.toString();
    const total = bike.quantity;
    const overlappingBookings = bookingsByBike[id] || [];
    const count = overlappingBookings.length;

    // Create a modified bike object with weekend pricing logic
    const bikeObject = bike.toObject();

    // Modify limitedKm.isActive based on weekend check
    if (bookingIncludesWeekend) {
      bikeObject.pricePerDay.limitedKm.isActive = false;
    }

    // Calculate pricing for both limited and unlimited options
    let priceLimited = null;
    let priceUnlimited = null;

    try {
      // Calculate limited km pricing (if active and not weekend)
      if (bikeObject.pricePerDay?.limitedKm?.isActive) {
        try {
          const limitedPricing = calculateRentalPricing({
            bike: bikeObject,
            startDate,
            startTime,
            endDate,
            endTime,
            kmOption: "limited",
          });
          priceLimited = {
            totalPrice: limitedPricing.totalPrice,
            breakdown: limitedPricing.breakdown,
            isWeekendBooking: limitedPricing.isWeekendBooking,
          };
        } catch (err) {
          console.log(`Limited pricing calculation failed for bike ${bike._id}:`, err.message);
          priceLimited = null;
        }
      }

      // Calculate unlimited km pricing (if active)
      if (bikeObject.pricePerDay?.unlimited?.isActive) {
        try {
          const unlimitedPricing = calculateRentalPricing({
            bike: bikeObject,
            startDate,
            startTime,
            endDate,
            endTime,
            kmOption: "unlimited",
          });
          priceUnlimited = {
            totalPrice: unlimitedPricing.totalPrice,
            breakdown: unlimitedPricing.breakdown,
            isWeekendBooking: unlimitedPricing.isWeekendBooking,
          };
        } catch (err) {
          console.log(`Unlimited pricing calculation failed for bike ${bike._id}:`, err.message);
          priceUnlimited = null;
        }
      }
    } catch (error) {
      console.log(`Pricing calculation error for bike ${bike._id}:`, error.message);
    }

    if (count < total) {
      // Bike is available
      let extraAmount = 0;

      try {
        const pricing = calculateExtraAmount({
          bike: { ...bike.toObject(), pricePerDay: bikeObject.pricePerDay }, // Use modified pricing
          startTime,
          endTime,
        });
        extraAmount = pricing;
      } catch (err) {
        console.log("🚀 ~ result ~ err:", err);
        extraAmount = 0;
      }

      return {
        ...bikeObject,
        isAvailable: true,
        availableUnits: total - count,
        extraAmount: extraAmount,
        // Add pricing calculations
        priceLimited,
        priceUnlimited,
        searchPeriod: {
          startDate,
          endDate,
          startTime,
          endTime,
        },
      };
    } else {
      // Bike is unavailable, calculate next available time
      const endTimes = overlappingBookings.map((b) => b.end.getTime());
      const nextAvailableTime =
        endTimes.length > 0 ? Math.min(...endTimes) : null;
      const nextAvailable = nextAvailableTime
        ? new Date(nextAvailableTime).toISOString()
        : null;

      return {
        ...bikeObject,
        isAvailable: false,
        availableUnits: 0,
        nextAvailable,
        // Add pricing calculations even for unavailable bikes
        priceLimited,
        priceUnlimited,
        searchPeriod: {
          startDate,
          endDate,
          startTime,
          endTime,
        },
      };
    }
  });

  // console.log("Available bikes with pricing:", result.length);

  // 7. Return the result with pricing calculations
  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
});
// @desc    Create new bike
// @route   POST /api/bikes
// @access  Private/Admin
export const createBike = asyncHandler(async (req, res) => {
  // Handle image uploads to S3 if they are base64 strings
  const { images, ...bikeData } = req.body;

  // Validate pricing options - at least one must be active
  if (
    (!bikeData.pricePerDay?.limitedKm?.isActive &&
      !bikeData.pricePerDay?.unlimited?.isActive) ||
    (bikeData.pricePerDay?.limitedKm?.isActive === false &&
      bikeData.pricePerDay?.unlimited?.isActive === false)
  ) {
    throw new ApiError(
      "At least one pricing option (limited or unlimited) must be active",
      400
    );
  }

  // Set default kmLimit to 60 if not provided
  if (
    bikeData.pricePerDay?.limitedKm &&
    !bikeData.pricePerDay.limitedKm.kmLimit
  ) {
    bikeData.pricePerDay.limitedKm.kmLimit = 60;
  }

  let uploadedImages = [];

  if (images && images.length > 0) {
    // Process and upload images to S3
    uploadedImages = await processAndUploadImages(images, "bikes");
  }

  // Set availableQuantity equal to quantity initially
  bikeData.availableQuantity = bikeData.quantity || 1;

  const bike = await Bike.create({
    ...bikeData,
    images: uploadedImages,
  });

  res.status(201).json({
    success: true,
    data: bike,
  });
});

export const getBikes = asyncHandler(async (req, res) => {
  const {
    search,
    limit = 10,
    page = 1,
    sort,
    isTrending,
    location,
    brand,
    minPrice,
    maxPrice,
  } = req.query;

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

  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: "i" };
  }

  // Filter by brand
  if (brand) {
    query.brand = { $regex: brand, $options: "i" };
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    query.$or = [];

    const priceFilter = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);

    if (Object.keys(priceFilter).length > 0) {
      query.$or.push({ "pricePerDay.limitedKm.price": priceFilter });
      query.$or.push({ "pricePerDay.unlimited.price": priceFilter });
    }
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

  // Get current bookings to determine actual available quantities
  const currentBookings = await Booking.find({
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed"] },
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  }).select("bike");

  // Create a map to count bookings per bike
  const bikeBookingCounts = {};
  currentBookings.forEach((booking) => {
    const bikeId = booking.bike.toString();
    bikeBookingCounts[bikeId] = (bikeBookingCounts[bikeId] || 0) + 1;
  });

  // Update bikes with accurate available quantities
  const bikesWithAccurateQuantities = bikes.map((bike) => {
    const bikeObj = bike.toObject();
    const bookedCount = bikeBookingCounts[bike._id.toString()] || 0;

    // Ensure availableQuantity is never negative
    bikeObj.availableQuantity = Math.max(0, (bike.quantity || 1) - bookedCount);

    return bikeObj;
  });

  res.status(200).json({
    success: true,
    count: bikesWithAccurateQuantities.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: bikesWithAccurateQuantities,
  });
});

// Update the getBike function to ensure availableQuantity is included in the response
// controllers/bikeController.js
// controllers/bikeController.js
// In getBike function, add helmet data
export const getBike = asyncHandler(async (req, res) => {
  const { startDate, startTime, endDate, endTime, kmOption } = req.query;
  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  let pricing = null;

  if (startDate && startTime && endDate && endTime) {
    try {
      pricing = calculateRentalPricing({
        bike,
        startDate,
        startTime,
        endDate,
        endTime,
        kmOption,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get bike availability
  const currentBookings = await Booking.countDocuments({
    bike: req.params.id,
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed", "pending"] },
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  // Get helmet availability
  const helmet = await Helmet.findOne({ isActive: true });
  let helmetInfo = null;

  if (helmet && startDate && endDate) {
    // Check helmet bookings for the requested period
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
    const availableHelmets = Math.max(0, helmet.totalQuantity - bookedHelmets);

    helmetInfo = {
      available: availableHelmets,
      pricePerHelmet: helmet.pricePerHelmet,
      freeHelmetPerBooking: helmet.freeHelmetPerBooking,
      maxQuantity: Math.min(availableHelmets, 10), // reasonable limit
    };
    console.log("helmetInfo1", helmetInfo);
  }

  const bikeResponse = bike.toObject();
  bikeResponse.availableQuantity = Math.max(0, bike.quantity - currentBookings);
  bikeResponse.pricing = pricing;
  bikeResponse.helmetInfo = helmetInfo;
  console.log("helmetInfo", helmetInfo);

  res.status(200).json({
    success: true,
    data: bikeResponse,
  });
});

// Update the updateBike function to handle quantity changes properly
export const updateBike = asyncHandler(async (req, res) => {
  let bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  const { images, quantity, availableQuantity, ...bikeData } = req.body;

  // Validate pricing options - at least one must be active
  if (
    bikeData.pricePerDay &&
    bikeData.pricePerDay.limitedKm &&
    bikeData.pricePerDay.unlimited &&
    bikeData.pricePerDay.limitedKm.isActive === false &&
    bikeData.pricePerDay.unlimited.isActive === false
  ) {
    throw new ApiError(
      "At least one pricing option (limited or unlimited) must be active",
      400
    );
  }

  // Set default kmLimit to 60 if not provided but limitedKm is active
  if (
    bikeData.pricePerDay?.limitedKm?.isActive &&
    (!bikeData.pricePerDay.limitedKm.kmLimit ||
      bikeData.pricePerDay.limitedKm.kmLimit <= 0)
  ) {
    bikeData.pricePerDay.limitedKm.kmLimit = 60;
  }

  // Handle image uploads if provided
  if (images && images.length > 0) {
    // Process and upload images to S3
    const uploadedImages = await processAndUploadImages(images, "bikes");
    bikeData.images = uploadedImages;
  }

  // Get current bookings for this bike
  const currentBookings = await Booking.countDocuments({
    bike: req.params.id,
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed", "pending"] },
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  // Handle quantity updates
  if (quantity !== undefined) {
    // Ensure quantity is at least equal to the number of current bookings
    if (quantity < currentBookings) {
      throw new ApiError(
        `Cannot set quantity less than current bookings (${currentBookings})`,
        400
      );
    }

    bikeData.quantity = quantity;

    // If availableQuantity is also provided, validate it
    if (availableQuantity !== undefined) {
      // Ensure availableQuantity is not less than (quantity - currentBookings)
      const minAvailableQuantity = quantity - currentBookings;
      if (availableQuantity < minAvailableQuantity) {
        throw new ApiError(
          `Available quantity cannot be less than ${minAvailableQuantity}`,
          400
        );
      }

      // Ensure availableQuantity is not more than quantity
      if (availableQuantity > quantity) {
        throw new ApiError(
          `Available quantity cannot be more than total quantity`,
          400
        );
      }

      bikeData.availableQuantity = availableQuantity;
    } else {
      // If availableQuantity is not provided, calculate it based on current bookings
      bikeData.availableQuantity = quantity - currentBookings;
    }
  } else if (availableQuantity !== undefined) {
    // If only availableQuantity is provided
    const maxAvailable = bike.quantity - currentBookings;

    // Ensure availableQuantity is not more than (quantity - currentBookings)
    if (availableQuantity > maxAvailable) {
      throw new ApiError(
        `Available quantity cannot be more than ${maxAvailable}`,
        400
      );
    }

    bikeData.availableQuantity = availableQuantity;
  }

  // Update status based on new availableQuantity
  if (bikeData.availableQuantity > 0 && bike.status !== "maintenance") {
    bikeData.status = "available";
  } else if (bikeData.availableQuantity === 0 && bike.status === "available") {
    bikeData.status = "booked";
  }

  bike = await Bike.findByIdAndUpdate(req.params.id, bikeData, {
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

  // Check if bike has active bookings
  const activeBookings = await Booking.countDocuments({
    bike: req.params.id,
    bookingStatus: { $in: ["pending", "confirmed"] },
  });

  if (activeBookings > 0) {
    throw new ApiError("Cannot delete bike with active bookings", 400);
  }

  // Delete images from S3
  if (bike.images && bike.images.length > 0) {
    for (const imageUrl of bike.images) {
      try {
        await deleteFromS3(imageUrl);
      } catch (error) {
        console.error(`Failed to delete image ${imageUrl} from S3:`, error);
      }
    }
  }

  await bike.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Add bike to maintenance
// @route   POST /api/bikes/:id/maintenance
// @access  Private/Employee
export const addBikeToMaintenance = asyncHandler(async (req, res) => {
  const { note } = req.body;

  if (!note) {
    throw new ApiError("Please provide a maintenance note", 400);
  }

  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Decrease available quantity by 1
  if (bike.availableQuantity > 0) {
    bike.availableQuantity -= 1;
  } else {
    throw new ApiError("No available bikes to send for maintenance", 400);
  }

  // If all bikes are in maintenance, update status
  if (bike.availableQuantity === 0) {
    bike.status = "maintenance";
  }

  // Create maintenance record
  const maintenance = await BikeMaintenance.create({
    bike: bike._id,
    note,
    createdBy: req.employee._id,
    status: "ongoing",
  });

  // Add to bike's maintenance history
  bike.maintenanceHistory.push({
    note,
    startDate: new Date(),
    status: "ongoing",
  });

  await bike.save();

  res.status(201).json({
    success: true,
    data: {
      bike,
      maintenance,
    },
  });
});

// @desc    Complete bike maintenance
// @route   PUT /api/bikes/maintenance/:id
// @access  Private/Employee
export const completeBikeMaintenance = asyncHandler(async (req, res) => {
  const maintenance = await BikeMaintenance.findById(req.params.id);

  if (!maintenance) {
    throw new ApiError("Maintenance record not found", 404);
  }

  if (maintenance.status === "completed") {
    throw new ApiError("Maintenance is already marked as completed", 400);
  }

  // Update maintenance record
  maintenance.status = "completed";
  maintenance.endDate = new Date();
  maintenance.completedBy = req.employee._id;

  await maintenance.save();

  // Update bike
  const bike = await Bike.findById(maintenance.bike);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Increase available quantity
  bike.availableQuantity += 1;

  // Update status if bike was in maintenance
  if (bike.status === "maintenance" && bike.availableQuantity > 0) {
    bike.status = "available";
  }

  // Update maintenance history entry
  const maintenanceEntry = bike.maintenanceHistory.find(
    (entry) => entry._id.toString() === maintenance._id.toString()
  );

  if (maintenanceEntry) {
    maintenanceEntry.status = "completed";
    maintenanceEntry.endDate = new Date();
    maintenanceEntry.completedBy = req.employee._id;
  }

  await bike.save();

  res.status(200).json({
    success: true,
    data: {
      bike,
      maintenance,
    },
  });
});

// @desc    Get bike maintenance history
// @route   GET /api/bikes/:id/maintenance
// @access  Private/Employee
export const getBikeMaintenanceHistory = asyncHandler(async (req, res) => {
  const maintenanceHistory = await BikeMaintenance.find({ bike: req.params.id })
    .populate({
      path: "createdBy",
      select: "name email",
    })
    .populate({
      path: "completedBy",
      select: "name email",
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: maintenanceHistory.length,
    data: maintenanceHistory,
  });
});

// @desc    Update bike status
// @route   PUT /api/bikes/:id/status
// @access  Private/Employee
export const updateBikeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (
    !status ||
    !["available", "unavailable", "maintenance"].includes(status)
  ) {
    throw new ApiError(
      "Please provide a valid status (available, maintenance, or unavailable)",
      400
    );
  }

  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Check if bike has active bookings before marking as unavailable
  if (status === "unavailable") {
    const activeBookings = await Booking.countDocuments({
      bike: req.params.id,
      bookingStatus: { $in: ["pending", "confirmed"] },
    });

    if (activeBookings > 0) {
      throw new ApiError(
        "Cannot mark bike as unavailable with active bookings",
        400
      );
    }
  }

  bike.status = status;

  // If marking as unavailable, set availableQuantity to 0
  if (status === "unavailable") {
    bike.availableQuantity = 0;
  }
  // If marking as available, reset availableQuantity to quantity
  else if (status === "available") {
    bike.availableQuantity = bike.quantity;
  }

  await bike.save();

  res.status(200).json({
    success: true,
    data: bike,
  });
});

// @desc    Get bike booking history
// @route   GET /api/bikes/:id/bookings
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
    count: bookings.length,
    data: bookings,
  });
});

// @desc    Get bike by ID for employee
// @route   GET /api/employee/bikes/:id
// @access  Private/Employee
export const getEmployeeBikeById = asyncHandler(async (req, res) => {
  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  res.status(200).json({
    success: true,
    data: bike,
  });
});

// @desc    Get all bikes for employee
// @route   GET /api/employee/bikes
// @access  Private/Employee
export const getEmployeeBikes = asyncHandler(async (req, res) => {
  const { search, limit = 10, page = 1, sort, status, brand } = req.query;

  // Build query
  const query = {};

  // Search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { model: { $regex: search, $options: "i" } },
      { registrationNumber: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by status
  if (status && status !== "all") {
    query.status = status;
  }

  // Filter by brand
  if (brand && brand !== "all") {
    query.brand = brand;
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

// @desc    Update bike by employee
// @route   PATCH /api/employee/bikes/:id
// @access  Private/Employee
export const updateEmployeeBike = asyncHandler(async (req, res) => {
  let bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  const { images, ...bikeData } = req.body;

  // Validate pricing options - at least one must be active
  if (
    bikeData.pricePerDay &&
    bikeData.pricePerDay.limitedKm &&
    bikeData.pricePerDay.unlimited &&
    bikeData.pricePerDay.limitedKm.isActive === false &&
    bikeData.pricePerDay.unlimited.isActive === false
  ) {
    throw new ApiError(
      "At least one pricing option (limited or unlimited) must be active",
      400
    );
  }

  // Set default kmLimit to 60 if not provided but limitedKm is active
  if (
    bikeData.pricePerDay?.limitedKm?.isActive &&
    (!bikeData.pricePerDay.limitedKm.kmLimit ||
      bikeData.pricePerDay.limitedKm.kmLimit <= 0)
  ) {
    bikeData.pricePerDay.limitedKm.kmLimit = 60;
  }

  // Handle image uploads if provided
  if (images && images.length > 0) {
    // Process and upload images to S3
    const uploadedImages = await processAndUploadImages(images, "bikes");
    bikeData.images = uploadedImages;
  }

  // Update availableQuantity if quantity is being updated
  if (bikeData.quantity !== undefined) {
    // Calculate the difference between new quantity and old quantity
    const quantityDifference = bikeData.quantity - bike.quantity;

    // Update availableQuantity accordingly
    bikeData.availableQuantity = Math.max(
      0,
      bike.availableQuantity + quantityDifference
    );

    // Update status based on new availableQuantity
    if (bikeData.availableQuantity > 0 && bike.status !== "maintenance") {
      bikeData.status = "available";
    } else if (
      bikeData.availableQuantity === 0 &&
      bike.status === "available"
    ) {
      bikeData.status = "booked";
    }
  }

  bike = await Bike.findByIdAndUpdate(req.params.id, bikeData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: bike,
  });
});

// @desc    Create new bike by employee
// @route   POST /api/employee/bikes
// @access  Private/Employee
export const createEmployeeBike = asyncHandler(async (req, res) => {
  // Handle image uploads to S3 if they are base64 strings
  const { images, ...bikeData } = req.body;

  // Validate pricing options - at least one must be active
  if (
    (!bikeData.pricePerDay?.limitedKm?.isActive &&
      !bikeData.pricePerDay?.unlimited?.isActive) ||
    (bikeData.pricePerDay?.limitedKm?.isActive === false &&
      bikeData.pricePerDay?.unlimited?.isActive === false)
  ) {
    throw new ApiError(
      "At least one pricing option (limited or unlimited) must be active",
      400
    );
  }

  // Set default kmLimit to 60 if not provided
  if (
    bikeData.pricePerDay?.limitedKm &&
    !bikeData.pricePerDay.limitedKm.kmLimit
  ) {
    bikeData.pricePerDay.limitedKm.kmLimit = 60;
  }

  let uploadedImages = [];

  if (images && images.length > 0) {
    // Process and upload images to S3
    uploadedImages = await processAndUploadImages(images, "bikes");
  }

  // Set availableQuantity equal to quantity initially
  bikeData.availableQuantity = bikeData.quantity || 1;

  const bike = await Bike.create({
    ...bikeData,
    images: uploadedImages,
  });

  res.status(201).json({
    success: true,
    data: bike,
  });
});
