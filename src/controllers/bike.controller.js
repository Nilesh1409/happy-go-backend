import Bike from "../models/bike.model.js";
import Booking from "../models/booking.model.js";
import Helmet from "../models/helmet.model.js";
import BikeMaintenance from "../models/bikeMaintenance.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteFromS3, processAndUploadImages } from "../utils/s3.js";
import {
  calculateExtraAmount,
  calculateRentalPricing,
} from "../utils/bikePricing.js";

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
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    const currentHour = istTime.getUTCHours();
    const currentMinute = istTime.getUTCMinutes();

    const startDate = new Date(istTime);
    let startHour, startMinute;

    if (currentHour < 8) {
      startHour = 8;
      startMinute = 0;
    } else if (currentHour >= 19 && currentMinute >= 30) {
      startDate.setUTCDate(startDate.getUTCDate() + 1);
      startHour = 8;
      startMinute = 0;
    } else {
      let nextHour = currentHour;
      let nextMinute;

      if (currentMinute < 30) {
        nextMinute = 30;
      } else {
        nextHour = currentHour + 1;
        nextMinute = 0;
      }

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

    const endDate = new Date(startDate);
    const endHour = 20;
    const endMinute = 0;

    const startDateStr =
      startDate.getUTCFullYear() +
      "-" +
      String(startDate.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(startDate.getUTCDate()).padStart(2, "0");

    const endDateStr =
      endDate.getUTCFullYear() +
      "-" +
      String(endDate.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(endDate.getUTCDate()).padStart(2, "0");

    const startTimeStr = `${String(startHour).padStart(2, "0")}:${String(
      startMinute
    ).padStart(2, "0")}`;
    const endTimeStr = `${String(endHour).padStart(2, "0")}:${String(
      endMinute
    ).padStart(2, "0")}`;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
    };
  };

  const { startDate, endDate, startTime, endTime } = getDefaultSearchPeriod();

  // Get trending bikes
  const bikes = await Bike.find({ isTrending: true }).limit(10);

  // Build Date objects for requested period
  const startRequested = new Date(`${startDate}T${startTime}:00`);
  const endRequested = new Date(`${endDate}T${endTime}:00`);

  // Updated weekend check - only Saturday (6) and Sunday (0)
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday, Saturday only
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

  const rawBookings = await Booking.aggregate([
    {
      $match: {
        bookingType: "bike",
        bookingStatus: { $in: ["confirmed"] },
        startDate: { $lte: endDateOnly },
        endDate: { $gte: startDateOnly },
      },
    },
    {
      $unwind: "$bikeItems",
    },
    {
      $group: {
        _id: "$bikeItems.bike",
        totalQuantity: { $sum: "$bikeItems.quantity" },
      },
    },
  ]);

  // Create booking map
  const bookingsByBike = rawBookings.reduce((map, booking) => {
    map[booking._id.toString()] = booking.totalQuantity;
    return map;
  }, {});

  // Process each trending bike with pricing and availability
  const result = await Promise.all(
    bikes.map(async (bike) => {
      const id = bike._id.toString();
      const total = bike.quantity;
      const booked = bookingsByBike[id] || 0;
      const available = Math.max(0, total - booked);

      // Create a modified bike object with weekend pricing logic
      const bikeObject = bike.toObject();

      // Determine pricing category based on weekend
      const pricingCategory = bookingIncludesWeekend ? "weekend" : "weekday";

      // Calculate pricing for appropriate options based on weekend/weekday
      let priceLimited = null;
      let priceUnlimited = null;

      try {
        // Weekend rule: Only unlimited km option is available
        // Weekday rule: Both limited and unlimited options are available

        // Calculate limited km pricing (only for weekdays)
        const limitedOption =
          bikeObject.pricePerDay?.[pricingCategory]?.limitedKm;
        if (
          !bookingIncludesWeekend &&
          limitedOption?.isActive &&
          limitedOption?.price
        ) {
          try {
            const limitedPricing = await calculateRentalPricing({
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
            console.log(
              `Limited pricing calculation failed for trending bike ${bike._id}:`,
              err.message
            );
            priceLimited = null;
          }
        }

        // Calculate unlimited km pricing (available for both weekdays and weekends)
        const unlimitedOption =
          bikeObject.pricePerDay?.[pricingCategory]?.unlimited;
        if (unlimitedOption?.isActive && unlimitedOption?.price) {
          try {
            const unlimitedPricing = await calculateRentalPricing({
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
            console.log(
              `Unlimited pricing calculation failed for bike ${bike._id}:`,
              err.message
            );
            priceUnlimited = null;
          }
        }
      } catch (error) {
        console.log(
          `Pricing calculation error for trending bike ${bike._id}:`,
          error.message
        );
      }

      return {
        ...bikeObject,
        isAvailable: available > 0,
        availableQuantity: available,
        totalQuantity: total,
        bookedQuantity: booked,
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
    })
  );

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
      const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;

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

// @desc    Get available bikes with pricing calculations and quantity information
// @route   GET /api/bikes/available
// @access  Public
export const getAvailableBikes = asyncHandler(async (req, res) => {
  const { startDate, endDate, startTime, endTime } = req.query;

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

  // Updated weekend check - only Saturday (6) and Sunday (0)
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday, Saturday only
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

  // 3. Load all active bikes (location filter removed)
  const bikeQuery = {
    isAvailable: true,
    status: { $ne: "unavailable" },
  };
  const bikes = await Bike.find(bikeQuery);

  // 4. Load bookings that overlap with the requested period and get quantities
  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  const rawBookings = await Booking.find({
    bookingType: "bike",
    bookingStatus: { $in: ["confirmed", "pending"] },
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

    // Check for overlapping bookings with exact date/time
    if (bStart <= endRequested && bEnd >= startRequested) {
      // Handle both single bike and bikeItems array structures
      const bikeItems =
        bk.bikeItems && bk.bikeItems.length > 0
          ? bk.bikeItems
          : [{ bike: bk.bike, quantity: 1 }];

      bikeItems.forEach((item) => {
        const id = item.bike.toString();
        if (!map[id]) {
          map[id] = {
            totalQuantity: 0,
            bookings: [],
          };
        }
        map[id].totalQuantity += item.quantity;
        map[id].bookings.push({
          start: bStart,
          end: bEnd,
          quantity: item.quantity,
        });
      });
    }
    return map;
  }, {});

  // 6. Process each bike and determine availability with pricing
  const result = await Promise.all(
    bikes.map(async (bike) => {
      const id = bike._id.toString();
      const total = bike.quantity;
      const bikeBookings = bookingsByBike[id];
      const booked = bikeBookings?.totalQuantity || 0;
      const available = Math.max(0, total - booked);

      // Create a modified bike object
      const bikeObject = bike.toObject();

      // Determine pricing category based on weekend
      const pricingCategory = bookingIncludesWeekend ? "weekend" : "weekday";

      // Calculate pricing for appropriate options based on weekend/weekday
      let priceLimited = null;
      let priceUnlimited = null;

      try {
        // Weekend rule: Only unlimited km option is available
        // Weekday rule: Both limited and unlimited options are available

        // Calculate limited km pricing (only for weekdays)
        const limitedOption =
          bikeObject.pricePerDay?.[pricingCategory]?.limitedKm;
        if (
          !bookingIncludesWeekend &&
          limitedOption?.isActive &&
          limitedOption?.price
        ) {
          try {
            const limitedPricing = await calculateRentalPricing({
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
            console.log(
              `Limited pricing calculation failed for bike ${bike._id}:`,
              err.message
            );
            priceLimited = null;
          }
        }

        // Calculate unlimited km pricing (available for both weekdays and weekends)
        const unlimitedOption =
          bikeObject.pricePerDay?.[pricingCategory]?.unlimited;
        if (unlimitedOption?.isActive && unlimitedOption?.price) {
          try {
            const unlimitedPricing = await calculateRentalPricing({
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
            console.log(
              `Unlimited pricing calculation failed for bike ${bike._id}:`,
              err.message
            );
            priceUnlimited = null;
          }
        }
      } catch (error) {
        console.log(
          `Pricing calculation error for bike ${bike._id}:`,
          error.message
        );
      }

      // Calculate extra charges
      let extraAmount = 0;
      try {
        extraAmount = calculateExtraAmount({
          bike: bikeObject,
          startTime,
          endTime,
        });
      } catch (err) {
        console.log("Extra amount calculation error:", err);
        extraAmount = 0;
      }

      // Calculate nextAvailable if bike is not available
      let nextAvailable = null;
      let nextAvailableDetails = null;
      if (available === 0 && bikeBookings?.bookings.length > 0) {
        // Find the earliest end time from overlapping bookings
        const endTimes = bikeBookings.bookings.map((b) => b.end.getTime());
        const nextAvailableTime =
          endTimes.length > 0 ? Math.min(...endTimes) : null;

        if (nextAvailableTime) {
          // Add 30 minutes to the end time
          const nextAvailableDate = new Date(
            nextAvailableTime + 30 * 60 * 1000
          );
          nextAvailableDetails = {
            date: nextAvailableDate.toISOString().split("T")[0],
            time: nextAvailableDate
              .toTimeString()
              .split(" ")[0]
              .substring(0, 5),
          };
          nextAvailable =
            nextAvailableDate.toISOString().split("T")[0] +
            " " +
            nextAvailableDate.toTimeString().split(" ")[0].substring(0, 5);
        }
      }

      const baseResult = {
        ...bikeObject,
        isAvailable: available > 0,
        availableQuantity: available,
        totalQuantity: total,
        bookedQuantity: booked,
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

      // Add nextAvailable only if bike is not available
      if (available === 0 && nextAvailable) {
        baseResult.nextAvailable = nextAvailable;
        baseResult.nextAvailableDetails = nextAvailableDetails;
      }

      return baseResult;
    })
  );
  console.log("result in bike availablity", result);

  // 7. Return the result with pricing calculations and quantity information
  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
});

// @desc    Create new bike with updated pricing structure
// @route   POST /api/bikes
// @access  Private/Admin
export const createBike = asyncHandler(async (req, res) => {
  // Handle image uploads to S3 if they are base64 strings
  const { images, ...bikeData } = req.body;

  // Validate pricing options - at least one category must be active
  const weekdayLimited = bikeData.pricePerDay?.weekday?.limitedKm?.isActive;
  const weekdayUnlimited = bikeData.pricePerDay?.weekday?.unlimited?.isActive;
  const weekendLimited = bikeData.pricePerDay?.weekend?.limitedKm?.isActive;
  const weekendUnlimited = bikeData.pricePerDay?.weekend?.unlimited?.isActive;

  if (
    !weekdayLimited &&
    !weekdayUnlimited &&
    !weekendLimited &&
    !weekendUnlimited
  ) {
    throw new ApiError("At least one pricing option must be active", 400);
  }

  // Set default kmLimit to 60 if not provided for limited options
  if (
    bikeData.pricePerDay?.weekday?.limitedKm &&
    !bikeData.pricePerDay.weekday.limitedKm.kmLimit
  ) {
    bikeData.pricePerDay.weekday.limitedKm.kmLimit = 60;
  }
  if (
    bikeData.pricePerDay?.weekend?.limitedKm &&
    !bikeData.pricePerDay.weekend.limitedKm.kmLimit
  ) {
    bikeData.pricePerDay.weekend.limitedKm.kmLimit = 60;
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

  // Filter by price range (updated for new pricing structure)
  if (minPrice || maxPrice) {
    query.$or = [];

    const priceFilter = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);

    if (Object.keys(priceFilter).length > 0) {
      query.$or.push({ "pricePerDay.weekday.limitedKm.price": priceFilter });
      query.$or.push({ "pricePerDay.weekday.unlimited.price": priceFilter });
      query.$or.push({ "pricePerDay.weekend.limitedKm.price": priceFilter });
      query.$or.push({ "pricePerDay.weekend.unlimited.price": priceFilter });
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
  const currentBookings = await Booking.aggregate([
    {
      $match: {
        bookingType: "bike",
        bookingStatus: { $in: ["confirmed", "pending"] },
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      },
    },
    {
      $unwind: "$bikeItems",
    },
    {
      $group: {
        _id: "$bikeItems.bike",
        totalQuantity: { $sum: "$bikeItems.quantity" },
      },
    },
  ]);

  // Create a map to count bookings per bike
  const bikeBookingCounts = {};
  currentBookings.forEach((booking) => {
    const bikeId = booking._id.toString();
    bikeBookingCounts[bikeId] = booking.totalQuantity;
  });

  // Update bikes with accurate available quantities
  const bikesWithAccurateQuantities = bikes.map((bike) => {
    const bikeObj = bike.toObject();
    const bookedCount = bikeBookingCounts[bike._id.toString()] || 0;

    // Ensure availableQuantity is never negative
    bikeObj.availableQuantity = Math.max(0, (bike.quantity || 1) - bookedCount);
    bikeObj.bookedQuantity = bookedCount;
    bikeObj.totalQuantity = bike.quantity || 1;

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

// @desc    Get single bike with availability and pricing info
// @route   GET /api/bikes/:id
// @access  Public
export const getBike = asyncHandler(async (req, res) => {
  const {
    startDate,
    startTime,
    endDate,
    endTime,
    kmOption,
    quantity = 1,
  } = req.query;
  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  let pricing = null;

  if (startDate && startTime && endDate && endTime) {
    try {
      pricing = await calculateRentalPricing({
        bike,
        startDate,
        startTime,
        endDate,
        endTime,
        kmOption,
        quantity: Number(quantity),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get bike availability for the requested period
  let availability = null;
  if (startDate && endDate && startTime && endTime) {
    const currentBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
          startDate: { $lte: new Date(`${endDate}T23:59:59`) },
          endDate: { $gte: new Date(`${startDate}T00:00:00`) },
        },
      },
      {
        $unwind: "$bikeItems",
      },
      {
        $match: {
          "bikeItems.bike": bike._id,
        },
      },
      {
        $group: {
          _id: null,
          totalBooked: { $sum: "$bikeItems.quantity" },
        },
      },
    ]);

    const bookedQuantity = currentBookings[0]?.totalBooked || 0;
    availability = {
      total: bike.quantity,
      booked: bookedQuantity,
      available: Math.max(0, bike.quantity - bookedQuantity),
    };
  } else {
    // Get current availability
    const currentBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
      },
      {
        $unwind: "$bikeItems",
      },
      {
        $match: {
          "bikeItems.bike": bike._id,
        },
      },
      {
        $group: {
          _id: null,
          totalBooked: { $sum: "$bikeItems.quantity" },
        },
      },
    ]);

    const bookedQuantity = currentBookings[0]?.totalBooked || 0;
    availability = {
      total: bike.quantity,
      booked: bookedQuantity,
      available: Math.max(0, bike.quantity - bookedQuantity),
    };
  }

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
          "helmetDetails.quantity": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalHelmetBookings: { $sum: "$helmetDetails.quantity" },
        },
      },
    ]);

    const bookedHelmets = helmetBookings[0]?.totalHelmetBookings || 0;
    const availableHelmets = Math.max(0, helmet.totalQuantity - bookedHelmets);

    helmetInfo = {
      available: availableHelmets,
      pricePerHelmet: helmet.pricePerHelmet,
      freeHelmetPerBooking: helmet.freeHelmetPerBooking,
      maxQuantity: Math.min(availableHelmets, 20), // reasonable limit
    };
  }

  const bikeResponse = bike.toObject();
  bikeResponse.availability = availability;
  bikeResponse.pricing = pricing;
  bikeResponse.helmetInfo = helmetInfo;

  res.status(200).json({
    success: true,
    data: bikeResponse,
  });
});

// @desc    Update bike with new pricing structure
// @route   PUT /api/bikes/:id
// @access  Private/Admin
export const updateBike = asyncHandler(async (req, res) => {
  let bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  const { images, quantity, availableQuantity, ...bikeData } = req.body;

  // Validate pricing options - at least one must be active
  if (bikeData.pricePerDay) {
    const weekdayLimited = bikeData.pricePerDay?.weekday?.limitedKm?.isActive;
    const weekdayUnlimited = bikeData.pricePerDay?.weekday?.unlimited?.isActive;
    const weekendLimited = bikeData.pricePerDay?.weekend?.limitedKm?.isActive;
    const weekendUnlimited = bikeData.pricePerDay?.weekend?.unlimited?.isActive;

    if (
      !weekdayLimited &&
      !weekdayUnlimited &&
      !weekendLimited &&
      !weekendUnlimited
    ) {
      throw new ApiError("At least one pricing option must be active", 400);
    }
  }

  // Set default kmLimit to 60 if not provided but limited options are active
  if (
    bikeData.pricePerDay?.weekday?.limitedKm?.isActive &&
    (!bikeData.pricePerDay.weekday.limitedKm.kmLimit ||
      bikeData.pricePerDay.weekday.limitedKm.kmLimit <= 0)
  ) {
    bikeData.pricePerDay.weekday.limitedKm.kmLimit = 60;
  }
  if (
    bikeData.pricePerDay?.weekend?.limitedKm?.isActive &&
    (!bikeData.pricePerDay.weekend.limitedKm.kmLimit ||
      bikeData.pricePerDay.weekend.limitedKm.kmLimit <= 0)
  ) {
    bikeData.pricePerDay.weekend.limitedKm.kmLimit = 60;
  }

  // Handle image uploads if provided
  if (images && images.length > 0) {
    // Process and upload images to S3
    const uploadedImages = await processAndUploadImages(images, "bikes");
    bikeData.images = uploadedImages;
  }

  // Get current bookings for this bike
  const currentBookings = await Booking.aggregate([
    {
      $match: {
        bookingType: "bike",
        bookingStatus: { $in: ["confirmed", "pending"] },
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      },
    },
    {
      $unwind: "$bikeItems",
    },
    {
      $match: {
        "bikeItems.bike": bike._id,
      },
    },
    {
      $group: {
        _id: null,
        totalBooked: { $sum: "$bikeItems.quantity" },
      },
    },
  ]);

  const currentBookedQuantity = currentBookings[0]?.totalBooked || 0;

  // Handle quantity updates
  if (quantity !== undefined) {
    // Ensure quantity is at least equal to the number of current bookings
    if (quantity < currentBookedQuantity) {
      throw new ApiError(
        `Cannot set quantity less than current bookings (${currentBookedQuantity})`,
        400
      );
    }

    bikeData.quantity = quantity;

    // If availableQuantity is also provided, validate it
    if (availableQuantity !== undefined) {
      // Ensure availableQuantity is not less than (quantity - currentBookings)
      const minAvailableQuantity = quantity - currentBookedQuantity;
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
      bikeData.availableQuantity = quantity - currentBookedQuantity;
    }
  } else if (availableQuantity !== undefined) {
    // If only availableQuantity is provided
    const maxAvailable = bike.quantity - currentBookedQuantity;

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
    "bikeItems.bike": req.params.id,
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

// @desc    Add special pricing period to bike
// @route   POST /api/bikes/:id/special-pricing
// @access  Private/Admin
export const addSpecialPricing = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, pricing } = req.body;

  if (!name || !startDate || !endDate || !pricing) {
    throw new ApiError("Please provide all required fields", 400);
  }

  // Validate that at least one pricing option is active
  const limitedActive = pricing.limitedKm?.isActive && pricing.limitedKm?.price;
  const unlimitedActive =
    pricing.unlimited?.isActive && pricing.unlimited?.price;

  if (!limitedActive && !unlimitedActive) {
    throw new ApiError(
      "At least one pricing option (limited or unlimited) must be active with a price",
      400
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    throw new ApiError("Start date must be before end date", 400);
  }

  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Set default km limit if not provided for limited option
  if (pricing.limitedKm?.isActive && !pricing.limitedKm?.kmLimit) {
    pricing.limitedKm.kmLimit = 60;
  }

  bike.specialPricing.push({
    name,
    startDate: start,
    endDate: end,
    pricing,
    createdBy: req.employee._id,
  });

  await bike.save();

  res.status(201).json({
    success: true,
    data: bike,
    message: "Special pricing period added successfully",
  });
});

// @desc    Update special pricing period
// @route   PUT /api/bikes/:id/special-pricing/:pricingId
// @access  Private/Admin
export const updateSpecialPricing = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, pricing, isActive } = req.body;

  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  const specialPricing = bike.specialPricing.id(req.params.pricingId);

  if (!specialPricing) {
    throw new ApiError("Special pricing period not found", 404);
  }

  if (name) specialPricing.name = name;
  if (startDate) specialPricing.startDate = new Date(startDate);
  if (endDate) specialPricing.endDate = new Date(endDate);
  if (isActive !== undefined) specialPricing.isActive = isActive;

  if (pricing) {
    // Validate that at least one pricing option is active if updating pricing
    const limitedActive =
      pricing.limitedKm?.isActive && pricing.limitedKm?.price;
    const unlimitedActive =
      pricing.unlimited?.isActive && pricing.unlimited?.price;

    if (!limitedActive && !unlimitedActive) {
      throw new ApiError(
        "At least one pricing option (limited or unlimited) must be active with a price",
        400
      );
    }

    // Set default km limit if not provided for limited option
    if (pricing.limitedKm?.isActive && !pricing.limitedKm?.kmLimit) {
      pricing.limitedKm.kmLimit = 60;
    }

    specialPricing.pricing = pricing;
  }

  await bike.save();

  res.status(200).json({
    success: true,
    data: bike,
    message: "Special pricing period updated successfully",
  });
});

// @desc    Get special pricing periods for a bike
// @route   GET /api/bikes/:id/special-pricing
// @access  Private/Employee or Admin
export const getSpecialPricing = asyncHandler(async (req, res) => {
  const bike = await Bike.findById(req.params.id).populate({
    path: "specialPricing.createdBy",
    select: "name email",
  });

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  res.status(200).json({
    success: true,
    count: bike.specialPricing.length,
    data: bike.specialPricing,
    message: "Special pricing periods retrieved successfully",
  });
});

// @desc    Delete special pricing period
// @route   DELETE /api/bikes/:id/special-pricing/:pricingId
// @access  Private/Admin
export const deleteSpecialPricing = asyncHandler(async (req, res) => {
  const bike = await Bike.findById(req.params.id);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  bike.specialPricing.pull(req.params.pricingId);
  await bike.save();

  res.status(200).json({
    success: true,
    data: bike,
    message: "Special pricing period deleted successfully",
  });
});

// Continue with existing maintenance and employee functions...
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
      "bikeItems.bike": req.params.id,
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
    "bikeItems.bike": req.params.id,
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
  if (bikeData.pricePerDay) {
    const weekdayLimited = bikeData.pricePerDay?.weekday?.limitedKm?.isActive;
    const weekdayUnlimited = bikeData.pricePerDay?.weekday?.unlimited?.isActive;
    const weekendLimited = bikeData.pricePerDay?.weekend?.limitedKm?.isActive;
    const weekendUnlimited = bikeData.pricePerDay?.weekend?.unlimited?.isActive;

    if (
      !weekdayLimited &&
      !weekdayUnlimited &&
      !weekendLimited &&
      !weekendUnlimited
    ) {
      throw new ApiError("At least one pricing option must be active", 400);
    }
  }

  // Set default kmLimit to 60 if not provided but limited options are active
  if (
    bikeData.pricePerDay?.weekday?.limitedKm?.isActive &&
    (!bikeData.pricePerDay.weekday.limitedKm.kmLimit ||
      bikeData.pricePerDay.weekday.limitedKm.kmLimit <= 0)
  ) {
    bikeData.pricePerDay.weekday.limitedKm.kmLimit = 60;
  }
  if (
    bikeData.pricePerDay?.weekend?.limitedKm?.isActive &&
    (!bikeData.pricePerDay.weekend.limitedKm.kmLimit ||
      bikeData.pricePerDay.weekend.limitedKm.kmLimit <= 0)
  ) {
    bikeData.pricePerDay.weekend.limitedKm.kmLimit = 60;
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
  const weekdayLimited = bikeData.pricePerDay?.weekday?.limitedKm?.isActive;
  const weekdayUnlimited = bikeData.pricePerDay?.weekday?.unlimited?.isActive;
  const weekendLimited = bikeData.pricePerDay?.weekend?.limitedKm?.isActive;
  const weekendUnlimited = bikeData.pricePerDay?.weekend?.unlimited?.isActive;

  if (
    !weekdayLimited &&
    !weekdayUnlimited &&
    !weekendLimited &&
    !weekendUnlimited
  ) {
    throw new ApiError("At least one pricing option must be active", 400);
  }

  // Set default kmLimit to 60 if not provided
  if (
    bikeData.pricePerDay?.weekday?.limitedKm &&
    !bikeData.pricePerDay.weekday.limitedKm.kmLimit
  ) {
    bikeData.pricePerDay.weekday.limitedKm.kmLimit = 60;
  }
  if (
    bikeData.pricePerDay?.weekend?.limitedKm &&
    !bikeData.pricePerDay.weekend.limitedKm.kmLimit
  ) {
    bikeData.pricePerDay.weekend.limitedKm.kmLimit = 60;
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
