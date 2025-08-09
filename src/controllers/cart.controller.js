import Cart from "../models/cart.model.js";
import Bike from "../models/bike.model.js";
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

  let cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    startTime,
    endTime,
  }).populate({
    path: "items.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    // Create empty cart
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      pricing: {
        subtotal: 0,
        total: 0,
      },
    });
  }

  // Recalculate pricing if cart has items
  if (cart.items.length > 0) {
    // Calculate availability for each bike in cart
    const startDateOnly = new Date(cart.startDate);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(cart.endDate);
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
    cart.items = cart.items.map((item) => {
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
    const totalBikeQuantity = cart.items.reduce(
      (total, item) => total + item.quantity,
      0
    );
    if (cart.helmetDetails.quantity === 0 && totalBikeQuantity > 0) {
      cart.helmetDetails.quantity = totalBikeQuantity;
    }

    const pricing = await calculateCartPricing({
      items: cart.items,
      startDate: cart.startDate.toISOString().split("T")[0],
      startTime: cart.startTime,
      endDate: cart.endDate.toISOString().split("T")[0],
      endTime: cart.endTime,
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
  if (cart.items.length > 0) {
    cartResponse.bookingDuration = calculateBookingDuration(
      cart.startDate,
      cart.startTime,
      cart.endDate,
      cart.endTime
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

  // Get or create cart
  let cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    startTime,
    endTime,
  });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
    });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.bike.toString() === bikeId && item.kmOption === kmOption
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    // Check total availability including cart quantity
    if (newQuantity > availability.available) {
      throw new ApiError(
        `Cannot add ${quantity} more bikes. Only ${
          availability.available - cart.items[existingItemIndex].quantity
        } more available`,
        400
      );
    }

    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      bike: bikeId,
      quantity,
      kmOption,
      pricePerUnit: 0, // Will be calculated
      totalPrice: 0, // Will be calculated
    });
  }

  // Recalculate pricing
  await cart.populate({
    path: "items.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  const pricing = await calculateCartPricing({
    items: cart.items,
    startDate,
    startTime,
    endDate,
    endTime,
    helmetQuantity: cart.helmetDetails.quantity,
  });

  // Update cart with new pricing
  cart.pricing = {
    subtotal: pricing.subtotal,
    bulkDiscount: pricing.bulkDiscount,
    extraCharges: pricing.extraCharges,
    gst: pricing.gst,
    gstPercentage: pricing.gstPercentage,
    total: pricing.total,
  };

  // Update individual item prices
  pricing.itemPricing.forEach((itemPrice, index) => {
    const cartItem = cart.items.find(
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
        availableItems: cart.items.map((item) => ({
          bikeId: item.bike._id.toString(),
          kmOption: item.kmOption,
        })),
      });
    }
  });

  cart.helmetDetails.charges = pricing.helmetCharges;
  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // Extend expiry

  await cart.save();

  res.status(200).json({
    success: true,
    data: cart,
    message:
      quantity > 1 ? `Added ${quantity} bikes to cart` : "Added bike to cart",
    savings:
      pricing.savings > 0
        ? `You saved ₹${pricing.savings.toFixed(2)} with bulk booking!`
        : null,
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

  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    "items._id": itemId,
  }).populate({
    path: "items.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    throw new ApiError("Cart item not found", 404);
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new ApiError("Cart item not found", 404);
  }

  // Check availability for new quantity
  const availability = await checkBikeAvailability(
    item.bike._id,
    cart.startDate.toISOString().split("T")[0],
    cart.endDate.toISOString().split("T")[0],
    cart.startTime,
    cart.endTime
  );

  if (quantity > availability.available) {
    throw new ApiError(
      `Only ${availability.available} bikes available for the selected period`,
      400
    );
  }

  item.quantity = quantity;

  // Recalculate pricing
  const pricing = await calculateCartPricing({
    items: cart.items,
    startDate: cart.startDate.toISOString().split("T")[0],
    startTime: cart.startTime,
    endDate: cart.endDate.toISOString().split("T")[0],
    endTime: cart.endTime,
    helmetQuantity: cart.helmetDetails.quantity,
  });

  // Update cart pricing
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
    const cartItem = cart.items.find(
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

  res.status(200).json({
    success: true,
    data: cart,
    message: "Cart updated successfully",
    savings:
      pricing.savings > 0
        ? `You saved ₹${pricing.savings.toFixed(2)} with bulk booking!`
        : null,
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
    "items._id": itemId,
  }).populate({
    path: "items.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    throw new ApiError("Cart item not found", 404);
  }

  cart.items.pull(itemId);

  if (cart.items.length === 0) {
    // Reset pricing for empty cart
    cart.pricing = {
      subtotal: 0,
      bulkDiscount: { amount: 0, percentage: 0 },
      surgeMultiplier: 1,
      extraCharges: 0,
      gst: 0,
      gstPercentage: 5,
      total: 0,
    };
    cart.helmetDetails = { quantity: 0, charges: 0 };
  } else {
    // Recalculate pricing
    const pricing = await calculateCartPricing({
      items: cart.items,
      startDate: cart.startDate.toISOString().split("T")[0],
      startTime: cart.startTime,
      endDate: cart.endDate.toISOString().split("T")[0],
      endTime: cart.endTime,
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

    // Update individual item prices
    pricing.itemPricing.forEach((itemPrice) => {
      const cartItem = cart.items.find(
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
  const { startDate, endDate, startTime, endTime } = req.query;

  if (quantity < 0 || quantity > 20) {
    throw new ApiError("Helmet quantity must be between 0 and 20", 400);
  }

  // Build query to find the specific cart
  let cartQuery = {
    user: req.user._id,
    isActive: true,
  };

  // If dates are provided, find cart for those specific dates
  if (startDate && endDate && startTime && endTime) {
    cartQuery.startDate = new Date(startDate);
    cartQuery.endDate = new Date(endDate);
    cartQuery.startTime = startTime;
    cartQuery.endTime = endTime;
  }

  const cart = await Cart.findOne(cartQuery).populate({
    path: "items.bike",
    select:
      "title brand model images pricePerDay quantity specialPricing bulkDiscounts",
  });

  if (!cart) {
    const errorMessage =
      startDate && endDate && startTime && endTime
        ? `Cart not found for dates ${startDate} to ${endDate}, ${startTime}-${endTime}`
        : "No active cart found";
    throw new ApiError(errorMessage, 404);
  }

  // Check helmet availability
  if (quantity > 0) {
    const helmet = await Helmet.findOne({ isActive: true });
    if (!helmet) {
      throw new ApiError("Helmet service not available", 400);
    }

    // Check helmet availability for the requested period
    const helmetBookings = await Booking.aggregate([
      {
        $match: {
          bookingType: "bike",
          bookingStatus: { $in: ["confirmed", "pending"] },
          startDate: { $lte: cart.endDate },
          endDate: { $gte: cart.startDate },
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

  cart.helmetDetails.quantity = quantity;

  // Calculate total bike quantity for reference
  const totalBikeQuantity = cart.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  console.log("Helmet update - Cart details:", {
    cartId: cart._id,
    dates: `${cart.startDate.toISOString().split("T")[0]} to ${
      cart.endDate.toISOString().split("T")[0]
    }`,
    times: `${cart.startTime}-${cart.endTime}`,
    totalBikes: totalBikeQuantity,
    helmetQuantity: quantity,
    itemsCount: cart.items.length,
  });

  // Recalculate pricing
  if (cart.items.length > 0) {
    const pricing = await calculateCartPricing({
      items: cart.items,
      startDate: cart.startDate.toISOString().split("T")[0],
      startTime: cart.startTime,
      endDate: cart.endDate.toISOString().split("T")[0],
      endTime: cart.endTime,
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
      const cartItem = cart.items.find(
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
          availableItems: cart.items.map((item) => ({
            bikeId: item.bike._id,
            kmOption: item.kmOption,
          })),
        });
      }
    });

    cart.helmetDetails.charges = pricing.helmetCharges;
    cart.helmetDetails.message = pricing.helmetMessage;
  }
  console.log("testing cart in updateHelmetQuantity", cart);

  cart.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await cart.save();

  res.status(200).json({
    success: true,
    data: cart,
    message: "Helmet quantity updated",
    debug: {
      cartId: cart._id,
      cartDates: `${cart.startDate.toISOString().split("T")[0]} to ${
        cart.endDate.toISOString().split("T")[0]
      }`,
      cartTimes: `${cart.startTime}-${cart.endTime}`,
      totalBikeQuantity,
      helmetQuantity: quantity,
      relationship: `${quantity} helmets for ${totalBikeQuantity} bike(s)`,
      itemsInCart: cart.items.length,
    },
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user._id, isActive: true },
    { isActive: false }
  );

  res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
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
