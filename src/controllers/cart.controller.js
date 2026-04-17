import Cart from "../models/cart.model.js";
import Bike from "../models/bike.model.js";
import Hostel from "../models/hostel.model.js";
import Booking from "../models/booking.model.js";
import Helmet from "../models/helmet.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateCartPricing } from "../utils/bikePricing.js";

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(async (req, res) => {
  const { startDate, endDate, startTime, endTime } = req.query;

  if (!startDate || !endDate || !startTime || !endTime) {
    throw new ApiError("Please provide booking dates and times", 400);
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  // Get or create cart (single active cart per user)
  let cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
  })
    .sort({ updatedAt: -1 }) // Get most recently updated cart
    .populate({
      path: "bikeItems.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    // Create empty cart with provided dates
    cart = await Cart.create({
      user: req.user._id,
      bikeItems: [],
      hostelItems: [],
      bikeDates: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      },
      hostelDates: {},
      pricing: {
        bikeSubtotal: 0,
        hostelSubtotal: 0,
        subtotal: 0,
        gst: 0,
        gstPercentage: 5,
        total: 0,
      },
      helmetDetails: {
        quantity: 0,
        charges: 0,
      },
    });
  } else if (startDate && endDate && startTime && endTime) {
    // Update bike dates if provided
    cart.bikeDates = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
    };
  }

  // Recalculate pricing if cart has items
  if (cart.bikeItems.length > 0) {
    // Filter out bikes that no longer exist in the database
    const validBikeItems = cart.bikeItems.filter((item) => item.bike !== null);
    
    if (validBikeItems.length !== cart.bikeItems.length) {
      console.log(`⚠️ Removed ${cart.bikeItems.length - validBikeItems.length} deleted bikes from cart`);
      cart.bikeItems = validBikeItems;
    }

    if (validBikeItems.length === 0) {
      // All bikes were invalid, reset cart
      cart.pricing = {
        bikeSubtotal: 0,
        hostelSubtotal: cart.pricing?.hostelSubtotal || 0,
        subtotal: cart.pricing?.hostelSubtotal || 0,
        bulkDiscount: { amount: 0, percentage: 0 },
        surgeMultiplier: 1,
        extraCharges: 0,
        gst: Math.round(((cart.pricing?.hostelSubtotal || 0) * 5) / 100),
        gstPercentage: 5,
        total: (cart.pricing?.hostelSubtotal || 0) + Math.round(((cart.pricing?.hostelSubtotal || 0) * 5) / 100),
      };
      cart.helmetDetails = { quantity: 0, charges: 0 };
      await cart.save();
    } else {
    // Calculate availability for each bike in cart
      const startDateOnly = new Date(cart.bikeDates.startDate);
    startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(cart.bikeDates.endDate);
    endDateOnly.setHours(23, 59, 59, 999);

    // Get bookings that overlap with cart period
    const rawBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
          startDate: { $lte: endDateOnly },
          endDate: { $gte: startDateOnly },
        },
      },
      {
        $addFields: {
          bikes: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$bikeItems", []] } }, 0] },
              then: "$bikeItems",
              else: [{ bike: "$bike", quantity: 1 }],
            },
          },
        },
      },
      {
        $unwind: "$bikes",
      },
      {
        $group: {
          _id: "$bikes.bike",
          totalQuantity: { $sum: "$bikes.quantity" },
        },
      },
    ]);

    // Create booking map
    const bookingsByBike = rawBookings.reduce((map, booking) => {
      map[booking._id.toString()] = booking.totalQuantity;
      return map;
    }, {});

    // Add availability info to each cart item
      cart.bikeItems = cart.bikeItems.map((item) => {
      const bikeId = item.bike._id.toString();
      const totalQuantity = item.bike.quantity;
      const bookedQuantity = bookingsByBike[bikeId] || 0;
      const availableQuantity = Math.max(0, totalQuantity - bookedQuantity);

      // Add availability info to the bike object
      item.bike = {
        ...item.bike.toObject(),
        totalQuantity,
        availableQuantity,
        bookedQuantity,
      };

      return item;
    });

    // Auto-set helmet quantity equal to total bike count if currently 0
      const totalBikeQuantity = cart.bikeItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    if (cart.helmetDetails.quantity === 0 && totalBikeQuantity > 0) {
      cart.helmetDetails.quantity = totalBikeQuantity;
    }

    const pricing = await calculateCartPricing({
        items: cart.bikeItems,
        startDate: cart.bikeDates.startDate.toISOString().split("T")[0],
        startTime: cart.bikeDates.startTime,
        endDate: cart.bikeDates.endDate.toISOString().split("T")[0],
        endTime: cart.bikeDates.endTime,
      helmetQuantity: cart.helmetDetails.quantity,
    });

    cart.pricing = {
      subtotal: pricing.subtotal,
      bulkDiscount: pricing.bulkDiscount,
      extraCharges: pricing.extraCharges,
      gst: pricing.gst,
      gstPercentage: pricing.gstPercentage,
      total: pricing.total,
    };

    cart.helmetDetails.charges = pricing.helmetCharges;
    cart.helmetDetails.message = pricing.helmetMessage;
    await cart.save();
    }
  }

  // Calculate booking duration using same logic as bike pricing
  const calculateBookingDuration = (startDate, startTime, endDate, endTime) => {
    const start = new Date(
      `${startDate.toISOString().split("T")[0]}T${startTime}:00`
    );
    const end = new Date(
      `${endDate.toISOString().split("T")[0]}T${endTime}:00`
    );

    const totalHours = (end - start) / (1000 * 60 * 60);

    // Calculate days based on date changes (same as bike pricing)
    const startDateOnly = new Date(startDate.toISOString().split("T")[0]);
    const endDateOnly = new Date(endDate.toISOString().split("T")[0]);
    const daysDifference =
      Math.ceil((endDateOnly - startDateOnly) / (1000 * 60 * 60 * 24)) + 1;

    // Check if weekend (same logic as bike pricing)
    const isWeekend = (date) => {
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday, Saturday only
    };

    const hasWeekendInRange = (start, end) => {
      const current = new Date(start);
      while (current <= end) {
        if (isWeekend(current)) {
          return true;
        }
        current.setDate(current.getDate() + 1);
      }
      return false;
    };

    const isWeekendBooking = hasWeekendInRange(start, end);

    // Duration calculation (same logic as bike pricing)
    let duration = "";
    let type = "";

    if (totalHours <= 5 && !isWeekendBooking && daysDifference === 1) {
      // Short weekday booking within same day
      duration = `${totalHours.toFixed(1)} hours`;
      type = "weekday_short";
    } else {
      // Full day pricing based on date changes
      duration = `${daysDifference} day(s)`;
      type = isWeekendBooking ? "weekend" : "weekday_full";
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalDays: daysDifference,
      duration: duration, // This matches the format from bike pricing
      type: type,
      isWeekendBooking: isWeekendBooking,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  const cartResponse = cart.toObject();
  if (cart.bikeItems.length > 0 && cart.bikeDates.startDate) {
    cartResponse.bookingDuration = calculateBookingDuration(
      cart.bikeDates.startDate,
      cart.bikeDates.startTime,
      cart.bikeDates.endDate,
      cart.bikeDates.endTime
    );
  }

  res.status(200).json({
    success: true,
    data: cartResponse,
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
export const addToCart = asyncHandler(async (req, res) => {
  const {
    bikeId,
    quantity = 1,
    kmOption,
    startDate,
    endDate,
    startTime,
    endTime,
  } = req.body;

  if (
    !bikeId ||
    !kmOption ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime
  ) {
    throw new ApiError("Please provide all required fields", 400);
  }

  if (!["limited", "unlimited"].includes(kmOption)) {
    throw new ApiError("Invalid km option", 400);
  }

  if (quantity < 1 || quantity > 10) {
    throw new ApiError("Quantity must be between 1 and 10", 400);
  }

  // Validate dates
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  if (isNaN(start) || isNaN(end) || start >= end) {
    throw new ApiError("Invalid booking dates", 400);
  }

  // Get bike and check availability
  const bike = await Bike.findById(bikeId);
  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Check if booking includes weekend days
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday, Saturday only
  };

  const bookingIncludesWeekend = () => {
    const current = new Date(start);
    while (current <= end) {
      if (isWeekend(current)) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  };

  const hasWeekendDays = bookingIncludesWeekend();

  // Weekend rule: Only unlimited km option is available on weekends
  if (hasWeekendDays && kmOption === "limited") {
    throw new ApiError(
      "Limited km option is not available for weekend bookings. Please select unlimited km option.",
      400
    );
  }

  // Use proper nested pricing structure validation
  const pricingCategory = hasWeekendDays ? "weekend" : "weekday";

  if (kmOption === "limited") {
    const limitedOption = bike?.pricePerDay?.[pricingCategory]?.limitedKm;

    if (
      !limitedOption?.isActive ||
      !limitedOption?.price ||
      limitedOption.price <= 0
    ) {
      throw new ApiError(
        `Limited km option is not available for ${pricingCategory} bookings`,
        400
      );
    }
  }

  if (kmOption === "unlimited") {
    const unlimitedOption = bike?.pricePerDay?.[pricingCategory]?.unlimited;

    if (
      !unlimitedOption?.isActive ||
      !unlimitedOption?.price ||
      unlimitedOption.price <= 0
    ) {
      throw new ApiError(
        `Unlimited km option is not available for ${pricingCategory} bookings`,
        400
      );
    }
  }

  // Check if bike is available for the requested period
  const availability = await checkBikeAvailability(
    bikeId,
    startDate,
    endDate,
    startTime,
    endTime
  );
  if (availability.available < quantity) {
    throw new ApiError(
      `Only ${availability.available} bikes available for the selected period`,
      400
    );
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  // Get or create cart (single active cart per user, regardless of dates)
  let cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
  }).sort({ updatedAt: -1 }); // Get most recently updated cart

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      bikeItems: [],
      hostelItems: [],
      bikeDates: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      },
      hostelDates: {},
      pricing: {
        bikeSubtotal: 0,
        hostelSubtotal: 0,
        subtotal: 0,
        gst: 0,
        gstPercentage: 5,
        total: 0,
      },
      helmetDetails: {
        quantity: 0,
        charges: 0,
      },
    });
  } else {
    // Update bike dates if cart already exists
    cart.bikeDates = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
    };
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.bikeItems.findIndex(
    (item) => item.bike.toString() === bikeId && item.kmOption === kmOption
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = cart.bikeItems[existingItemIndex].quantity + quantity;

    // Check total availability including cart quantity
    if (newQuantity > availability.available) {
      throw new ApiError(
        `Cannot add ${quantity} more bikes. Only ${
          availability.available - cart.bikeItems[existingItemIndex].quantity
        } more available`,
        400
      );
    }

    cart.bikeItems[existingItemIndex].quantity = newQuantity;
    
    // Auto-increase helmet count when adding more bikes (1 helmet per bike)
    cart.helmetDetails.quantity += quantity;
    console.log(`🪖 Auto-increased helmet count by ${quantity} (total: ${cart.helmetDetails.quantity})`);
  } else {
    // Add new item
    cart.bikeItems.push({
      bike: bikeId,
      quantity,
      kmOption,
      pricePerUnit: 0, // Will be calculated
      totalPrice: 0, // Will be calculated
    });
    
    // Auto-increase helmet count for new bikes (1 helmet per bike)
    cart.helmetDetails.quantity += quantity;
    console.log(`🪖 Auto-increased helmet count by ${quantity} for new item (total: ${cart.helmetDetails.quantity})`);
  }

  // Recalculate pricing
  await cart.populate({
    path: "bikeItems.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  const pricing = await calculateCartPricing({
    items: cart.bikeItems,
    startDate,
    startTime,
    endDate,
    endTime,
    helmetQuantity: cart.helmetDetails.quantity,
  });

  // Preserve hostelSubtotal if it exists
  const hostelSubtotal = cart.pricing?.hostelSubtotal || 0;
  const hostelGst = Math.round((hostelSubtotal * pricing.gstPercentage) / 100);

  // Update cart with new pricing (bike pricing + preserve hostel pricing)
  // pricing.total already includes extraCharges, bulk discount, helmet charges, and GST for bikes
  cart.pricing = {
    bikeSubtotal: pricing.subtotal,
    hostelSubtotal: hostelSubtotal,
    subtotal: pricing.subtotal + hostelSubtotal,
    bulkDiscount: pricing.bulkDiscount,
    extraCharges: pricing.extraCharges,
    gst: pricing.gst + hostelGst,
    gstPercentage: pricing.gstPercentage,
    total: pricing.total + hostelSubtotal + hostelGst,
  };

  // Update individual item prices
  pricing.itemPricing.forEach((itemPrice, index) => {
    const cartItem = cart.bikeItems.find(
      (item) =>
        item.bike._id.toString() === itemPrice.bikeId.toString() &&
        item.kmOption === itemPrice.kmOption
    );
    if (cartItem) {
      cartItem.pricePerUnit = itemPrice.pricePerUnit;
      cartItem.totalPrice = itemPrice.totalPrice;
    } else {
      console.error(`Cart item not found for pricing update:`, {
        bikeId: itemPrice.bikeId,
        kmOption: itemPrice.kmOption,
        availableItems: cart.bikeItems.map((item) => ({
          bikeId: item.bike._id.toString(),
          kmOption: item.kmOption,
        })),
      });
    }
  });

  cart.helmetDetails.charges = pricing.helmetCharges;
  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Extend expiry

  await cart.save();

  // Prepare response message
  let message = quantity > 1 ? `Added ${quantity} bikes to cart` : "Added bike to cart";
  message += `. Added ${quantity} helmet${quantity > 1 ? 's' : ''} automatically.`;

  res.status(200).json({
    success: true,
    data: cart,
    message: message,
    savings:
      pricing.savings > 0
        ? `You saved ₹${pricing.savings.toFixed(2)} with bulk booking!`
        : null,
    helmetAutoAdded: quantity,
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  if (!quantity || quantity < 1 || quantity > 10) {
    throw new ApiError("Quantity must be between 1 and 10", 400);
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    "bikeItems._id": itemId,
  })
    .sort({ updatedAt: -1 })
    .populate({
      path: "bikeItems.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    throw new ApiError("Cart item not found", 404);
  }

  const item = cart.bikeItems.id(itemId);
  if (!item) {
    throw new ApiError("Cart item not found", 404);
  }

  // Check availability for new quantity
  const availability = await checkBikeAvailability(
    item.bike._id,
    cart.bikeDates.startDate.toISOString().split("T")[0],
    cart.bikeDates.endDate.toISOString().split("T")[0],
    cart.bikeDates.startTime,
    cart.bikeDates.endTime
  );

  if (quantity > availability.available) {
    throw new ApiError(
      `Only ${availability.available} bikes available for the selected period`,
      400
    );
  }

  // Store old quantity to check if we need to increase helmets
  const oldQuantity = item.quantity;
  item.quantity = quantity;

  // Auto-increase helmet count when bike quantity increases (1 helmet per bike)
  // But don't auto-decrease when bike quantity decreases
  if (quantity > oldQuantity) {
    const quantityIncrease = quantity - oldQuantity;
    cart.helmetDetails.quantity += quantityIncrease;
    console.log(`🪖 Auto-increased helmet count by ${quantityIncrease} (total: ${cart.helmetDetails.quantity})`);
  }

  // Recalculate pricing
  const pricing = await calculateCartPricing({
    items: cart.bikeItems,
    startDate: cart.bikeDates.startDate.toISOString().split("T")[0],
    startTime: cart.bikeDates.startTime,
    endDate: cart.bikeDates.endDate.toISOString().split("T")[0],
    endTime: cart.bikeDates.endTime,
    helmetQuantity: cart.helmetDetails.quantity,
  });

  // Preserve hostelSubtotal if it exists
  const hostelSubtotal = cart.pricing?.hostelSubtotal || 0;
  const hostelGst = Math.round((hostelSubtotal * pricing.gstPercentage) / 100);

  // Update cart pricing (bike pricing + preserve hostel pricing)
  // pricing.total already includes extraCharges, bulk discount, helmet charges, and GST for bikes
  cart.pricing = {
    bikeSubtotal: pricing.subtotal,
    hostelSubtotal: hostelSubtotal,
    subtotal: pricing.subtotal + hostelSubtotal,
    bulkDiscount: pricing.bulkDiscount,
    extraCharges: pricing.extraCharges,
    gst: pricing.gst + hostelGst,
    gstPercentage: pricing.gstPercentage,
    total: pricing.total + hostelSubtotal + hostelGst,
  };

  // Update individual item prices
  pricing.itemPricing.forEach((itemPrice) => {
    const cartItem = cart.bikeItems.find(
      (item) =>
        item.bike._id.toString() === itemPrice.bikeId.toString() &&
        item.kmOption === itemPrice.kmOption
    );
    if (cartItem) {
      cartItem.pricePerUnit = itemPrice.pricePerUnit;
      cartItem.totalPrice = itemPrice.totalPrice;
    }
  });

  cart.helmetDetails.charges = pricing.helmetCharges;
  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await cart.save();

  // Prepare response message
  let message = "Cart updated successfully";
  if (quantity > oldQuantity) {
    const quantityIncrease = quantity - oldQuantity;
    message += `. Added ${quantityIncrease} helmet${quantityIncrease > 1 ? 's' : ''} automatically.`;
  }

  res.status(200).json({
    success: true,
    data: cart,
    message: message,
    savings:
      pricing.savings > 0
        ? `You saved ₹${pricing.savings.toFixed(2)} with bulk booking!`
        : null,
    helmetAutoAdded: quantity > oldQuantity ? quantity - oldQuantity : 0,
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    "bikeItems._id": itemId,
  })
    .sort({ updatedAt: -1 })
    .populate({
      path: "bikeItems.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    throw new ApiError("Cart item not found", 404);
  }

  cart.bikeItems.pull(itemId);

  // Preserve hostelSubtotal if it exists
  const hostelSubtotal = cart.pricing?.hostelSubtotal || 0;

  if (cart.bikeItems.length === 0) {
    // Reset bike pricing for empty bike cart, but preserve hostel pricing
    cart.pricing = {
      bikeSubtotal: 0,
      hostelSubtotal: hostelSubtotal,
      subtotal: hostelSubtotal,
      bulkDiscount: { amount: 0, percentage: 0 },
      surgeMultiplier: 1,
      extraCharges: 0,
      gst: Math.round((hostelSubtotal * 5) / 100),
      gstPercentage: 5,
      total: hostelSubtotal + Math.round((hostelSubtotal * 5) / 100),
    };
    cart.helmetDetails = { quantity: 0, charges: 0 };
  } else {
    // Recalculate pricing
    const pricing = await calculateCartPricing({
      items: cart.bikeItems,
      startDate: cart.bikeDates.startDate.toISOString().split("T")[0],
      startTime: cart.bikeDates.startTime,
      endDate: cart.bikeDates.endDate.toISOString().split("T")[0],
      endTime: cart.bikeDates.endTime,
      helmetQuantity: cart.helmetDetails.quantity,
    });

    const hostelGst = Math.round((hostelSubtotal * pricing.gstPercentage) / 100);
    cart.pricing = {
      bikeSubtotal: pricing.subtotal,
      hostelSubtotal: hostelSubtotal,
      subtotal: pricing.subtotal + hostelSubtotal,
      bulkDiscount: pricing.bulkDiscount,
      extraCharges: pricing.extraCharges,
      gst: pricing.gst + hostelGst,
      gstPercentage: pricing.gstPercentage,
      total: pricing.total + hostelSubtotal + hostelGst,
    };

    // Update individual item prices
    pricing.itemPricing.forEach((itemPrice) => {
      const cartItem = cart.bikeItems.find(
        (item) =>
          item.bike._id.toString() === itemPrice.bikeId.toString() &&
          item.kmOption === itemPrice.kmOption
      );
      if (cartItem) {
        cartItem.pricePerUnit = itemPrice.pricePerUnit;
        cartItem.totalPrice = itemPrice.totalPrice;
      }
    });

    cart.helmetDetails.charges = pricing.helmetCharges;
  }

  await cart.save();

  res.status(200).json({
    success: true,
    data: cart,
    message: "Item removed from cart",
  });
});

// @desc    Update helmet quantity in cart
// @route   PUT /api/cart/helmets
// @access  Private
export const updateHelmetQuantity = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (quantity < 0 || quantity > 20) {
    throw new ApiError("Helmet quantity must be between 0 and 20", 400);
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  // Get the most recent active cart (no date filtering needed)
  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
  })
    .sort({ updatedAt: -1 })  // Get most recently updated cart
    .populate({
      path: "bikeItems.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    throw new ApiError("No active cart found. Please add items to cart first.", 404);
  }

  // Check helmet availability
  if (quantity > 0) {
    const helmet = await Helmet.findOne({ isActive: true });
    if (!helmet) {
      throw new ApiError("Helmet service not available", 400);
    }

    // Check helmet availability for the requested period (if cart has bike dates)
    if (cart.bikeDates?.startDate && cart.bikeDates?.endDate) {
    const helmetBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
            startDate: { $lte: cart.bikeDates.endDate },
            endDate: { $gte: cart.bikeDates.startDate },
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
    const availableHelmets = helmet.totalQuantity - bookedHelmets;

    if (quantity > availableHelmets) {
      throw new ApiError(
        `Only ${availableHelmets} helmets available for the selected period`,
        400
      );
      }
    }
  }

  cart.helmetDetails.quantity = quantity;

  // Calculate total bike quantity for reference
  const totalBikeQuantity = cart.bikeItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Recalculate pricing
  if (cart.bikeItems.length > 0 && cart.bikeDates?.startDate) {
    const pricing = await calculateCartPricing({
      items: cart.bikeItems,
      startDate: cart.bikeDates.startDate.toISOString().split("T")[0],
      startTime: cart.bikeDates.startTime,
      endDate: cart.bikeDates.endDate.toISOString().split("T")[0],
      endTime: cart.bikeDates.endTime,
      helmetQuantity: quantity,
    });

    cart.pricing = {
      subtotal: pricing.subtotal,
      bulkDiscount: pricing.bulkDiscount,
      extraCharges: pricing.extraCharges,
      gst: pricing.gst,
      gstPercentage: pricing.gstPercentage,
      total: pricing.total,
    };

    // Update individual item prices
    pricing.itemPricing.forEach((itemPrice) => {
      const cartItem = cart.bikeItems.find(
        (item) =>
          item.bike._id.toString() === itemPrice.bikeId.toString() &&
          item.kmOption === itemPrice.kmOption
      );
      if (cartItem) {
        cartItem.pricePerUnit = itemPrice.pricePerUnit;
        cartItem.totalPrice = itemPrice.totalPrice;
      } else {
        console.error(`Cart item not found for pricing update:`, {
          bikeId: itemPrice.bikeId,
          kmOption: itemPrice.kmOption,
          availableItems: cart.bikeItems.map((item) => ({
            bikeId: item.bike._id,
            kmOption: item.kmOption,
          })),
        });
      }
    });

    cart.helmetDetails.charges = pricing.helmetCharges;
    cart.helmetDetails.message = pricing.helmetMessage;
  }

  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await cart.save();

  res.status(200).json({
    success: true,
    data: cart,
    message: "Helmet quantity updated",
    debug: {
      cartId: cart._id,
      cartDates: cart.bikeDates?.startDate 
        ? `${cart.bikeDates.startDate.toISOString().split("T")[0]} to ${cart.bikeDates.endDate.toISOString().split("T")[0]}`
        : "No dates",
      cartTimes: cart.bikeDates?.startTime 
        ? `${cart.bikeDates.startTime}-${cart.bikeDates.endTime}`
        : "No times",
      totalBikeQuantity,
      helmetQuantity: quantity,
      relationship: `${quantity} helmets for ${totalBikeQuantity} bike(s)`,
      itemsInCart: cart.bikeItems.length,
    },
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  await Cart.findOneAndUpdate(
    { user: req.user._id, isActive: true },
    { isActive: false }
  );

  res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
  });
});

// @desc    Add hostel to cart
// @route   POST /api/cart/hostels
// @access  Private
export const addHostelToCart = asyncHandler(async (req, res) => {
  const {
    hostelId,
    roomType,
    mealOption,
    quantity = 1,
    checkIn,
    checkOut,
    isWorkstation = false,
  } = req.body;

  // Validate required fields
  if (!hostelId || !roomType || !mealOption || !checkIn || !checkOut) {
    throw new ApiError("Please provide all required fields", 400);
  }

  if (!["bedOnly", "bedAndBreakfast", "bedBreakfastAndDinner"].includes(mealOption)) {
    throw new ApiError("Invalid meal option", 400);
  }

  if (quantity < 1 || quantity > 10) {
    throw new ApiError("Quantity must be between 1 and 10", 400);
  }

  // Validate dates
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate) || isNaN(checkOutDate) || checkInDate >= checkOutDate) {
    throw new ApiError("Invalid check-in or check-out dates", 400);
  }

  // Get hostel and check availability
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) {
    throw new ApiError("Hostel not found", 404);
  }

  // Find the room
  const room = hostel.rooms.find((r) => r.type === roomType);
  if (!room) {
    throw new ApiError("Room type not found", 404);
  }

  // Check workstation requirement
  if (isWorkstation && !room.isWorkstationFriendly) {
    throw new ApiError("This room is not available for workstation stays", 400);
  }

  // Calculate number of nights
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

  // Get price
  const pricePerNight =
    room.mealOptions[mealOption].discountedPrice ||
    room.mealOptions[mealOption].basePrice;

  const totalPrice = pricePerNight * nights * quantity;

  // Check availability
  const availability = await checkHostelAvailability(hostelId, roomType, checkIn, checkOut);
  if (availability.available < quantity) {
    throw new ApiError(
      `Only ${availability.available} beds available for the selected period`,
      400
    );
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  // Get or create cart
  let cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
  });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      bikeItems: [],
      hostelItems: [],
      bikeDates: {},
      hostelDates: {},
      pricing: {
        bikeSubtotal: 0,
        hostelSubtotal: 0,
        subtotal: 0,
        gst: 0,
        gstPercentage: 5,
        total: 0,
      },
      helmetDetails: {
        quantity: 0,
        charges: 0,
      },
    });
  }

  // Update hostel dates if not set or different
  cart.hostelDates = {
    checkIn: checkInDate,
    checkOut: checkOutDate,
  };

  // Check if item already exists in cart
  const existingItemIndex = cart.hostelItems.findIndex(
    (item) =>
      item.hostel.toString() === hostelId &&
      item.roomType === roomType &&
      item.mealOption === mealOption
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = cart.hostelItems[existingItemIndex].quantity + quantity;

    if (newQuantity > availability.available) {
      throw new ApiError(
        `Cannot add ${quantity} more beds. Only ${
          availability.available - cart.hostelItems[existingItemIndex].quantity
        } more available`,
        400
      );
    }

    cart.hostelItems[existingItemIndex].quantity = newQuantity;
    cart.hostelItems[existingItemIndex].totalPrice = pricePerNight * nights * newQuantity;
  } else {
    // Add new item
    cart.hostelItems.push({
      hostel: hostelId,
      roomType,
      mealOption,
      quantity,
      pricePerNight,
      numberOfNights: nights,
      totalPrice,
      isWorkstation,
    });
  }

  // Recalculate pricing
  cart.pricing.hostelSubtotal = cart.hostelItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  
  // Ensure bikeSubtotal is initialized (in case this is a new cart or bikes haven't been added yet)
  if (!cart.pricing.bikeSubtotal) {
    cart.pricing.bikeSubtotal = 0;
  }
  
  cart.pricing.subtotal = cart.pricing.bikeSubtotal + cart.pricing.hostelSubtotal;
  cart.pricing.gst = Math.round((cart.pricing.subtotal * cart.pricing.gstPercentage) / 100);
  cart.pricing.total = cart.pricing.subtotal + cart.pricing.gst;

  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Extend expiry
  await cart.save();

  // Populate hostel details
  await cart.populate({
    path: "hostelItems.hostel",
    select: "name location images ratings",
  });

  res.status(200).json({
    success: true,
    data: cart,
    message: quantity > 1 ? `Added ${quantity} beds to cart` : "Added bed to cart",
  });
});

// @desc    Get complete cart details (bikes + hostels)
// @route   GET /api/cart/details
// @access  Private
export const getCartDetails = asyncHandler(async (req, res) => {
  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  // Get the most recent active cart (sorted by updatedAt descending)
  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
  })
    .sort({ updatedAt: -1 })  // Get the most recently updated cart
    .populate({
      path: "bikeItems.bike",
      select: "title brand model images pricePerDay quantity availableQuantity",
    })
    .populate({
      path: "hostelItems.hostel",
      select: "name location images ratings rooms",
    });

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: {
        bikeItems: [],
        hostelItems: [],
        pricing: {
          bikeSubtotal: 0,
          hostelSubtotal: 0,
          subtotal: 0,
          gst: 0,
          total: 0,
        },
        isEmpty: true,
      },
    });
  }

  // Filter out invalid items (deleted bikes/hostels) and add room details to hostel items
  let validBikeItems = cart.bikeItems.filter((item) => item.bike !== null);
  const validHostelItems = [];
  const removedItems = {
    bikes: cart.bikeItems.length - validBikeItems.length,
    hostels: 0,
  };

  // Process hostel items and filter out invalid ones
  for (const item of cart.hostelItems) {
    if (!item.hostel) {
      // Hostel was deleted from database
      removedItems.hostels++;
      continue;
    }

    const hostel = item.hostel;
    const room = hostel.rooms?.find((r) => r.type === item.roomType);

    validHostelItems.push({
      ...item.toObject(),
      roomDetails: room || null,
    });
  }

  // Compute availableQuantity live for each bike based on the cart's date range
  if (validBikeItems.length > 0 && cart.bikeDates?.startDate) {
    const startDateOnly = new Date(cart.bikeDates.startDate);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(cart.bikeDates.endDate);
    endDateOnly.setHours(23, 59, 59, 999);

    const rawBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
          startDate: { $lte: endDateOnly },
          endDate: { $gte: startDateOnly },
        },
      },
      {
        $addFields: {
          bikes: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$bikeItems", []] } }, 0] },
              then: "$bikeItems",
              else: [{ bike: "$bike", quantity: 1 }],
            },
          },
        },
      },
      { $unwind: "$bikes" },
      {
        $group: {
          _id: "$bikes.bike",
          totalBooked: { $sum: "$bikes.quantity" },
        },
      },
    ]);

    const bookingsByBike = rawBookings.reduce((map, b) => {
      map[b._id.toString()] = b.totalBooked;
      return map;
    }, {});

    validBikeItems = validBikeItems.map((item) => {
      if (!item.bike) return item;
      const bikeId = item.bike._id.toString();
      const totalQuantity = item.bike.quantity;
      const bookedQuantity = bookingsByBike[bikeId] || 0;
      return {
        ...item.toObject(),
        bike: {
          ...item.bike.toObject(),
          totalQuantity,
          bookedQuantity,
          availableQuantity: Math.max(0, totalQuantity - bookedQuantity),
        },
      };
    });
  }

  // If items were removed, update the cart
  let cartNeedsUpdate = false;
  if (removedItems.bikes > 0 || removedItems.hostels > 0) {
    cart.bikeItems = validBikeItems;
    cart.hostelItems = validHostelItems.map((item) => {
      // Remove the added roomDetails before saving
      const { roomDetails, ...hostelItem } = item;
      return hostelItem;
    });
    
    // Recalculate pricing if items were removed
    let bikeSubtotal = 0;
    let hostelSubtotal = 0;

    if (validBikeItems.length > 0 && cart.bikeDates?.startDate) {
      try {
        const bikePricing = await calculateCartPricing({
          items: validBikeItems,
          startDate: cart.bikeDates.startDate.toISOString().split("T")[0],
          startTime: cart.bikeDates.startTime,
          endDate: cart.bikeDates.endDate.toISOString().split("T")[0],
          endTime: cart.bikeDates.endTime,
          helmetQuantity: cart.helmetDetails?.quantity || 0,
        });
        bikeSubtotal = bikePricing.subtotal;
        cart.helmetDetails.charges = bikePricing.helmetCharges;
      } catch (error) {
        console.error("Error recalculating bike pricing:", error);
        bikeSubtotal = 0;
        cart.helmetDetails = { quantity: 0, charges: 0 };
      }
    } else {
      cart.helmetDetails = { quantity: 0, charges: 0 };
    }

    if (validHostelItems.length > 0) {
      hostelSubtotal = validHostelItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    cart.pricing = {
      bikeSubtotal,
      hostelSubtotal,
      subtotal: bikeSubtotal + hostelSubtotal,
      bulkDiscount: cart.pricing?.bulkDiscount || { amount: 0, percentage: 0 },
      surgeMultiplier: cart.pricing?.surgeMultiplier || 1,
      extraCharges: cart.pricing?.extraCharges || 0,
      gst: Math.round(((bikeSubtotal + hostelSubtotal) * 5) / 100),
      gstPercentage: 5,
      total: bikeSubtotal + hostelSubtotal + Math.round(((bikeSubtotal + hostelSubtotal) * 5) / 100),
    };

    cartNeedsUpdate = true;
  }

  const cartResponse = {
    _id: cart._id,
    bikeItems: validBikeItems,
    hostelItems: validHostelItems,
    bikeDates: cart.bikeDates || {},
    hostelDates: cart.hostelDates || {},
    pricing: cart.pricing,
    helmetDetails: cart.helmetDetails,
    isEmpty: validBikeItems.length === 0 && validHostelItems.length === 0,
    summary: {
      totalBikes: validBikeItems.reduce((sum, item) => sum + item.quantity, 0),
      totalBeds: validHostelItems.reduce((sum, item) => sum + item.quantity, 0),
      bikeSubtotal: cart.pricing.bikeSubtotal || 0,
      hostelSubtotal: cart.pricing.hostelSubtotal || 0,
      subtotal: cart.pricing.subtotal || 0,
      gst: cart.pricing.gst || 0,
      total: cart.pricing.total || 0,
    },
  };

  // Save cart if it was updated
  if (cartNeedsUpdate) {
    try {
      await cart.save();
      
      // Add warning message if items were removed
      if (removedItems.bikes > 0 || removedItems.hostels > 0) {
        cartResponse.warning = {
          message: "Some items were removed from your cart because they are no longer available",
          removedBikes: removedItems.bikes,
          removedHostels: removedItems.hostels,
        };
      }
    } catch (error) {
      console.error("Error saving cart after cleanup:", error);
      // Continue with response even if save fails
    }
  }

  res.status(200).json({
    success: true,
    data: cartResponse,
  });
});

// @desc    Remove hostel from cart
// @route   DELETE /api/cart/hostels/:itemId
// @access  Private
export const removeHostelFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    "hostelItems._id": itemId,
  }).populate({
    path: "hostelItems.hostel",
    select: "name location images ratings",
  });

  if (!cart) {
    throw new ApiError("Cart item not found", 404);
  }

  cart.hostelItems.pull(itemId);

  // Recalculate pricing
  cart.pricing.hostelSubtotal = cart.hostelItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  cart.pricing.subtotal = cart.pricing.bikeSubtotal + cart.pricing.hostelSubtotal;
  cart.pricing.gst = Math.round((cart.pricing.subtotal * cart.pricing.gstPercentage) / 100);
  cart.pricing.total = cart.pricing.subtotal + cart.pricing.gst;

  await cart.save();

  res.status(200).json({
    success: true,
    data: cart,
    message: "Item removed from cart",
  });
});

// @desc    Update hostel cart item quantity
// @route   PUT /api/cart/hostels/:itemId
// @access  Private
export const updateHostelCartQuantity = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  // Validate quantity
  if (!quantity || quantity < 1) {
    throw new ApiError("Quantity must be at least 1", 400);
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    throw new ApiError("User authentication failed. Please login again.", 401);
  }

  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    "hostelItems._id": itemId,
  }).populate({
    path: "hostelItems.hostel",
    select: "name location images ratings rooms",
  });

  if (!cart) {
    throw new ApiError("Cart item not found", 404);
  }

  // Find the specific hostel item
  const hostelItem = cart.hostelItems.id(itemId);
  if (!hostelItem) {
    throw new ApiError("Cart item not found", 404);
  }

  // Check availability for the new quantity
  const availability = await checkHostelAvailability(
    hostelItem.hostel._id,
    hostelItem.roomType,
    cart.hostelDates.checkIn,
    cart.hostelDates.checkOut
  );

  if (availability.available < quantity) {
    throw new ApiError(
      `Only ${availability.available} beds available for the selected period`,
      400
    );
  }

  // Update quantity and recalculate total price
  hostelItem.quantity = quantity;
  hostelItem.totalPrice = hostelItem.pricePerNight * hostelItem.numberOfNights * quantity;

  // Recalculate cart pricing
  cart.pricing.hostelSubtotal = cart.hostelItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  cart.pricing.subtotal = cart.pricing.bikeSubtotal + cart.pricing.hostelSubtotal;
  cart.pricing.gst = Math.round((cart.pricing.subtotal * cart.pricing.gstPercentage) / 100);
  cart.pricing.total = cart.pricing.subtotal + cart.pricing.gst;

  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Extend expiry
  await cart.save();

  // Populate hostel details
  await cart.populate({
    path: "hostelItems.hostel",
    select: "name location images ratings",
  });

  res.status(200).json({
    success: true,
    data: cart,
    message: `Updated quantity to ${quantity}`,
  });
});

// Helper function to check bike availability
async function checkBikeAvailability(
  bikeId,
  startDate,
  endDate,
  startTime,
  endTime
) {
  const bike = await Bike.findById(bikeId);
  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  const startRequested = new Date(`${startDate}T${startTime}`);
  const endRequested = new Date(`${endDate}T${endTime}`);

  // Get overlapping bookings
  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  const overlappingBookings = await Booking.aggregate([
    {
      $match: {
        bookingType: "bike",
        bookingStatus: { $in: ["confirmed", "pending"] },
        startDate: { $lte: endDateOnly },
        endDate: { $gte: startDateOnly },
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

  const bookedQuantity = overlappingBookings[0]?.totalBooked || 0;
  const available = Math.max(0, bike.quantity - bookedQuantity);

  return {
    total: bike.quantity,
    booked: bookedQuantity,
    available,
  };
}

// Helper function to check hostel availability
async function checkHostelAvailability(hostelId, roomType, checkIn, checkOut) {
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) {
    throw new ApiError("Hostel not found", 404);
  }

  const room = hostel.rooms.find((r) => r.type === roomType);
  if (!room) {
    throw new ApiError("Room type not found", 404);
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Find overlapping bookings
  // Use strict inequality to allow same-day check-out/check-in turnover
  // Example: Existing booking ends Jan 28, new booking starts Jan 28 = OK
  const overlappingBookings = await Booking.find({
    bookingType: "hostel",
    hostel: hostelId,
    roomType: roomType,
    $or: [
      {
        startDate: { $lt: checkOutDate },  // Existing booking starts before new check-out
        endDate: { $gt: checkInDate },     // Existing booking ends after new check-in
      },
    ],
    bookingStatus: { $nin: ["cancelled"] },
  }).select("numberOfBeds");

  // Count total beds booked (sum of numberOfBeds from all overlapping bookings)
  let totalBookedBeds = 0;
  overlappingBookings.forEach((booking) => {
    totalBookedBeds += booking.numberOfBeds || 1;
  });

  const available = Math.max(0, room.totalBeds - totalBookedBeds);

  return {
    total: room.totalBeds,
    booked: totalBookedBeds,
    available,
  };
}
