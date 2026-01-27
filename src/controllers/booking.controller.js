import Booking from "../models/booking.model.js";
import Bike from "../models/bike.model.js";
import Hostel from "../models/hostel.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendEmail } from "../utils/sendEmail.js";
import Helmet from "../models/helmet.model.js";
import {
  calculateRentalPricing,
  calculateExtraAmount,
} from "../utils/bikePricing.js";
// const mongoose = require("mongoose");

// @desc    Create new booking for single bike or multiple bikes
// @route   POST /api/bookings
// @access  Private
export const createBooking = asyncHandler(async (req, res) => {
  const {
    bookingType,
    // Single bike booking (legacy support)
    bikeId,
    // Multiple bike booking (new)
    bikeItems,
    // Common fields
    hostelId,
    roomType,
    startDate,
    endDate,
    startTime,
    endTime,
    numberOfPeople,
    numberOfBeds,
    mealOption,
    priceDetails,
    bikeDetails,
    hostelDetails,
    couponCode,
    specialRequests,
    guestDetails,
    helmetQuantity = 0,
  } = req.body;

  // Validate booking type
  if (!bookingType || !["bike", "hostel"].includes(bookingType)) {
    throw new ApiError("Invalid booking type", 400);
  }

  // Validate required fields based on booking type
  if (bookingType === "bike") {
    // Validate required bike fields
    if (!startDate || !endDate || !startTime || !endTime || !priceDetails) {
      throw new ApiError(
        "Please provide startDate, endDate, startTime, endTime and priceDetails",
        400
      );
    }

    // Support both single bike (legacy) and multiple bikes (new)
    const isMultipleBikes = bikeItems && bikeItems.length > 0;
    const isSingleBike = bikeId && bikeDetails;

    if (!isMultipleBikes && !isSingleBike) {
      throw new ApiError(
        "Please provide either bikeId with bikeDetails for single bike or bikeItems array for multiple bikes",
        400
      );
    }

    // Parse requested start/end as Date objects
    const startRequested = new Date(`${startDate}T${startTime}:00`);
    const endRequested = new Date(`${endDate}T${endTime}:00`);

    if (isNaN(startRequested) || isNaN(endRequested)) {
      throw new ApiError("Invalid date or time format", 400);
    }
    if (startRequested >= endRequested) {
      throw new ApiError("Start date/time must be before end date/time", 400);
    }

    // Check if booking includes weekend days
    const isWeekend = (date) => {
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday, Saturday only
    };

    const bookingIncludesWeekend = () => {
      const current = new Date(startRequested);
      while (current <= endRequested) {
        if (isWeekend(current)) {
          return true;
        }
        current.setDate(current.getDate() + 1);
      }
      return false;
    };

    const hasWeekendDays = bookingIncludesWeekend();

    let processedBikeItems = [];
    let totalQuantity = 0;

    if (isMultipleBikes) {
      // Process multiple bikes booking
      for (const item of bikeItems) {
        if (!item.bike || !item.quantity || !item.kmOption) {
          throw new ApiError(
            "Each bike item must have bike, quantity, and kmOption",
            400
          );
        }

        // Fetch bike document
        const bike = await Bike.findById(item.bike);
        if (!bike) {
          throw new ApiError(`Bike with ID ${item.bike} not found`, 404);
        }

        // Validate pricing options using proper nested structure
        const pricingCategory = hasWeekendDays ? "weekend" : "weekday";

        if (item.kmOption === "unlimited") {
          const unlimitedOption =
            bike.pricePerDay?.[pricingCategory]?.unlimited;
          if (!unlimitedOption?.isActive || !unlimitedOption?.price) {
            throw new ApiError(
              `Unlimited km option is not available for ${bike.title} on ${pricingCategory} bookings`,
              400
            );
          }
        }

        if (item.kmOption === "limited") {
          const limitedOption = bike.pricePerDay?.[pricingCategory]?.limitedKm;
          if (!limitedOption?.isActive || !limitedOption?.price) {
            throw new ApiError(
              `Limited km option is not available for ${bike.title} on ${pricingCategory} bookings`,
              400
            );
          }
        }

        // Weekend rule: Only unlimited km option is available on weekends
        if (hasWeekendDays && item.kmOption === "limited") {
          throw new ApiError(
            `Limited km option is not available for ${bike.title} on weekend bookings. Please select unlimited km option.`,
            400
          );
        }

        // Check bike availability for the requested period
        const startDateOnly = new Date(startDate);
        startDateOnly.setHours(0, 0, 0, 0);
        const endDateOnly = new Date(endDate);
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
          {
            $unwind: "$bikes",
          },
          {
            $match: {
              "bikes.bike": bike._id,
            },
          },
          {
            $group: {
              _id: null,
              totalBooked: { $sum: "$bikes.quantity" },
            },
          },
        ]);

        const bookedQuantity = rawBookings[0]?.totalBooked || 0;
        const availableQuantity = Math.max(0, bike.quantity - bookedQuantity);

        if (item.quantity > availableQuantity) {
          throw new ApiError(
            `Only ${availableQuantity} units of ${bike.title} are available for the selected period`,
            400
          );
        }

        // Get pricing details
        const pricingOption =
          item.kmOption === "unlimited"
            ? bike.pricePerDay[pricingCategory].unlimited
            : bike.pricePerDay[pricingCategory].limitedKm;

        processedBikeItems.push({
          bike: bike._id,
          quantity: item.quantity,
          kmOption: item.kmOption,
          pricePerUnit: item.pricePerUnit || pricingOption.price,
          totalPrice: item.totalPrice || pricingOption.price * item.quantity,
          kmLimit:
            item.kmOption === "limited" ? pricingOption.kmLimit : undefined,
          additionalKmPrice: bike.additionalKmPrice,
          bikeUnits: Array.from({ length: item.quantity }, (_, index) => ({
            unitNumber: index + 1,
            status: "pending",
          })),
        });

        totalQuantity += item.quantity;
      }
    } else {
      // Process single bike booking (legacy support)
      const bike = await Bike.findById(bikeId);
      if (!bike) {
        throw new ApiError("Bike not found", 404);
      }

      // Validate pricing options using proper nested structure
      const pricingCategory = hasWeekendDays ? "weekend" : "weekday";

      if (bikeDetails.isUnlimited) {
        const unlimitedOption = bike.pricePerDay?.[pricingCategory]?.unlimited;
        if (!unlimitedOption?.isActive || !unlimitedOption?.price) {
          throw new ApiError(
            `Unlimited km option is not available for ${pricingCategory} bookings`,
            400
          );
        }
      }

      if (!bikeDetails.isUnlimited) {
        const limitedOption = bike.pricePerDay?.[pricingCategory]?.limitedKm;
        if (!limitedOption?.isActive || !limitedOption?.price) {
          throw new ApiError(
            `Limited km option is not available for ${pricingCategory} bookings`,
            400
          );
        }
      }

      // Weekend rule: Only unlimited km option is available on weekends
      if (hasWeekendDays && !bikeDetails.isUnlimited) {
        throw new ApiError(
          "Limited km option is not available for weekend bookings. Please select unlimited km option.",
          400
        );
      }

      // Check single bike availability
      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(endDate);
      endDateOnly.setHours(23, 59, 59, 999);

      const rawBookings = await Booking.find({
        bookingType: "bike",
        bike: bikeId,
        bookingStatus: { $in: ["confirmed"] },
        startDate: { $lte: endDateOnly },
        endDate: { $gte: startDateOnly },
      }).select("startDate endDate startTime endTime bike");

      const bookingsByBike = rawBookings.reduce((map, bk) => {
        const bStart = new Date(bk.startDate);
        const [sh, sm] = bk.startTime.split(":").map(Number);
        bStart.setHours(sh, sm, 0, 0);

        const bEnd = new Date(bk.endDate);
        const [eh, em] = bk.endTime.split(":").map(Number);
        bEnd.setHours(eh, em, 0, 0);

        if (bStart <= endRequested && bEnd >= startRequested) {
          const idStr = bk.bike.toString();
          if (!map[idStr]) map[idStr] = [];
          map[idStr].push({ start: bStart, end: bEnd });
        }
        return map;
      }, {});

      const bikeIdStr = bike._id.toString();
      const overlappingBookings = bookingsByBike[bikeIdStr] || [];
      const alreadyBookedCount = overlappingBookings.length;
      const totalUnits = bike.quantity;

      if (alreadyBookedCount >= totalUnits) {
        throw new ApiError(
          "Bike is not available for the selected period",
          400
        );
      }

      totalQuantity = 1;
    }

    // Validate helmet availability and charges if requested
    if (helmetQuantity > 0) {
      const helmet = await Helmet.findOne({ isActive: true });
      if (!helmet) {
        throw new ApiError("Helmet service is currently unavailable", 400);
      }

      // Check helmet availability for the requested period
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
      const availableHelmets = helmet.totalQuantity - bookedHelmets;

      if (helmetQuantity > availableHelmets) {
        throw new ApiError(
          `Only ${availableHelmets} helmets available for the selected period`,
          400
        );
      }

      // Validate helmet charges calculation - 1 free helmet per bike, multiplied by rental days
      const startDateOnly = new Date(startDate);
      const endDateOnly = new Date(endDate);
      const rentalDays = Math.ceil((endDateOnly - startDateOnly) / (1000 * 60 * 60 * 24)) + 1;
      
      const freeHelmets = totalQuantity;
      const expectedHelmetCharges =
        Math.max(0, helmetQuantity - freeHelmets) * helmet.pricePerHelmet * rentalDays;
      const sentHelmetCharges = priceDetails.helmetCharges || 0;

      if (Math.abs(expectedHelmetCharges - sentHelmetCharges) > 0.01) {
        console.log("Helmet charges mismatch:", {
          expected: expectedHelmetCharges,
          sent: sentHelmetCharges,
          requestedHelmets: helmetQuantity,
          freeHelmets: freeHelmets,
          pricePerHelmet: helmet.pricePerHelmet,
          rentalDays: rentalDays,
        });
        throw new ApiError(
          "Helmet charges calculation mismatch. Please refresh and try again.",
          400
        );
      }
    }

    // Initialize payment details for partial payment support
    const totalAmount = priceDetails.totalAmount;
    const partialPaymentPercentage = 25; // 25% initial payment

    // Create booking with either single bike or multiple bikes
    const bookingData = {
      user: req.user._id,
      bookingType: "bike",
      startDate,
      endDate,
      startTime,
      endTime,
      priceDetails,
      helmetDetails: {
        quantity: helmetQuantity,
        charges: priceDetails.helmetCharges || 0,
      },
      couponCode,
      specialRequests,
      guestDetails,
      bookingStatus: "pending",
      paymentStatus: "pending",
      // Initialize payment details for partial payment tracking
      paymentDetails: {
        totalAmount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        partialPaymentPercentage: partialPaymentPercentage,
        paymentHistory: []
      }
    };

    if (isMultipleBikes) {
      // Multiple bikes booking
      bookingData.bikeItems = processedBikeItems;
    } else {
      // Single bike booking (legacy)
      bookingData.bike = bikeId;
      bookingData.bikeDetails = {
        ...bikeDetails,
        helmetQuantity: helmetQuantity,
        helmetCharges: priceDetails.helmetCharges || 0,
      };
    }

    const booking = await Booking.create(bookingData);

    // Clear cart after booking creation
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (cart) {
      // Clear bike items from cart
      cart.bikeItems = [];
      cart.pricing.bikeSubtotal = 0;
      cart.pricing.subtotal = cart.pricing.hostelSubtotal;
      cart.pricing.gst = (cart.pricing.subtotal * cart.pricing.gstPercentage) / 100;
      cart.pricing.total = cart.pricing.subtotal + cart.pricing.gst;
      cart.helmetDetails.quantity = 0;
      cart.helmetDetails.charges = 0;
      await cart.save();
    }

    // Update bike availability for all bikes
    if (isMultipleBikes) {
      for (const item of processedBikeItems) {
        const bike = await Bike.findById(item.bike);
        bike.availableQuantity = Math.max(
          0,
          bike.availableQuantity - item.quantity
        );
        if (bike.availableQuantity <= 0) {
          bike.status = "booked";
        }
        await bike.save();
      }
    } else {
      const bike = await Bike.findById(bikeId);
      bike.availableQuantity = bike.availableQuantity - 1;
      if (bike.availableQuantity <= 0) {
        bike.status = "booked";
      }
      await bike.save();
    }

    // Send confirmation email & SMS
    const user = await User.findById(req.user._id).select("name email mobile");
    const gstPercentage = priceDetails.gstPercentage || 5;

    const bikeInfo = isMultipleBikes
      ? `${processedBikeItems.length} bike(s) with ${totalQuantity} total units`
      : "1 bike";

    // const emailMessage = `
    //   <h1>Bike Booking Confirmation</h1>
    //   <p>Dear ${user.name},</p>
    //   <p>Your bike booking has been confirmed.</p>
    //   <p>Booking ID: ${booking._id}</p>
    //   <p>Bikes: ${bikeInfo}</p>
    //   <p>Start: ${new Date(
    //     startDate + "T" + startTime + ":00"
    //   ).toLocaleString()}</p>
    //   <p>End: ${new Date(endDate + "T" + endTime + ":00").toLocaleString()}</p>
    //   <p>Helmets: ${helmetQuantity}</p>
    //   <p>Helmet Charges: ₹${(priceDetails.helmetCharges || 0).toFixed(2)}</p>
    //   <p>Extra Charges: ₹${(priceDetails.extraCharges || 0).toFixed(2)}</p>
    //   <p>GST (${gstPercentage}%): ₹${(priceDetails.taxes || 0).toFixed(2)}</p>
    //   <p>Total Amount: ₹${priceDetails.totalAmount.toFixed(2)}</p>
    //   <p>Thank you for choosing HappyGo!</p>
    // `;

    // await sendEmail({
    //   email: user.email,
    //   subject: "HappyGo Bike Booking Confirmation",
    //   message: emailMessage,
    // });

    // Calculate partial payment amounts for response
    const partialAmount = Math.round((totalAmount * partialPaymentPercentage) / 100);

    return res.status(201).json({
      success: true,
      data: {
        ...booking.toObject(),
        paymentOptions: {
          partialPayment: {
            amount: partialAmount,
            percentage: partialPaymentPercentage
          },
          fullPayment: {
            amount: totalAmount,
            percentage: 100
          }
        }
      },
    });
  } else if (bookingType === "hostel") {
    // Hostel booking logic
    if (
      !hostelId ||
      !roomType ||
      !startDate ||
      !endDate ||
      !numberOfBeds ||
      !mealOption
    ) {
      throw new ApiError(
        `Please provide all required fields for hostel booking (hostelId, roomType, startDate, endDate, numberOfBeds, mealOption)`,
        400
      );
    }

    // Validate stayType for hostel bookings (optional field)
    if (hostelDetails?.stayType && 
        !["hostel", "workstation"].includes(hostelDetails.stayType)) {
      throw new ApiError("Invalid stay type. Must be 'hostel' or 'workstation'", 400);
    }

    // Validate meal option
    if (!["bedOnly", "bedAndBreakfast", "bedBreakfastAndDinner"].includes(mealOption)) {
      throw new ApiError("Invalid meal option. Must be 'bedOnly', 'bedAndBreakfast', or 'bedBreakfastAndDinner'", 400);
    }

    // Check if hostel exists
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      throw new ApiError("Hostel not found", 404);
    }

    // Check if room type exists
    const room = hostel.rooms.find((r) => r.type === roomType);
    if (!room) {
      throw new ApiError("Room type not found in this hostel", 404);
    }

    // For workstation bookings, verify room is workstation-friendly
    if (hostelDetails?.stayType === "workstation" && !room.isWorkstationFriendly) {
      throw new ApiError("Selected room is not available for workstation stays", 400);
    }

    // Validate meal option exists for this room
    if (!room.mealOptions[mealOption]) {
      throw new ApiError(`Meal option '${mealOption}' is not available for this room type`, 400);
    }

    // Check if enough beds are available
    // Use strict inequality to allow same-day check-out/check-in
    const existingBookings = await Booking.find({
      bookingType: "hostel",
      hostel: hostelId,
      roomType,
      $or: [
        {
          startDate: { $lt: new Date(endDate) },    // Existing starts before new check-out
          endDate: { $gt: new Date(startDate) },    // Existing ends after new check-in
        },
      ],
      bookingStatus: { $nin: ["cancelled"] },
    });

    // Calculate total booked beds for this room type
    let totalBookedBeds = 0;
    existingBookings.forEach((booking) => {
      totalBookedBeds += booking.numberOfBeds || 1;
    });

    if (totalBookedBeds + numberOfBeds > room.totalBeds) {
      throw new ApiError(
        `Only ${
          room.totalBeds - totalBookedBeds
        } beds available for the selected dates in this room type`,
        400
      );
    }

    // Calculate number of nights
    const checkInDate = new Date(startDate);
    const checkOutDate = new Date(endDate);
    const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // Initialize payment details for partial payment support
    const totalAmount = priceDetails.totalAmount;
    const partialPaymentPercentage = 25; // 25% initial payment
    const partialAmount = Math.round((totalAmount * partialPaymentPercentage) / 100);
    const remainingAmount = totalAmount - partialAmount;

    // Create hostel booking with payment tracking
    const booking = await Booking.create({
      user: req.user._id,
      bookingType: "hostel",
      hostel: hostelId,
      roomType,
      mealOption,
      numberOfBeds,
      startDate,
      endDate,
      checkIn: startDate,
      checkOut: endDate,
      numberOfNights,
      numberOfPeople: numberOfPeople || numberOfBeds,
      priceDetails,
      hostelDetails: hostelDetails || {},
      couponCode,
      specialRequests,
      guestDetails,
      bookingStatus: "pending",
      paymentStatus: "pending",
      // Initialize payment details
      paymentDetails: {
        totalAmount: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        partialPaymentPercentage: partialPaymentPercentage,
        paymentHistory: []
      }
    });

    // No need to update availableBeds - it's calculated dynamically on fetch

    // Clear hostel items from cart after booking creation
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (cart) {
      // Clear hostel items from cart
      cart.hostelItems = [];
      cart.pricing.hostelSubtotal = 0;
      cart.pricing.subtotal = cart.pricing.bikeSubtotal;
      cart.pricing.gst = (cart.pricing.subtotal * cart.pricing.gstPercentage) / 100;
      cart.pricing.total = cart.pricing.subtotal + cart.pricing.gst;
      await cart.save();
    }

    // Send confirmation email
    const user = await User.findById(req.user._id);
    const emailMessage = `
      <h1>Hostel Booking Created</h1>
      <p>Dear ${user.name},</p>
      <p>Your hostel booking has been created and is pending payment.</p>
      <p>Booking ID: ${booking._id}</p>
      <p>Hostel: ${hostel.name}</p>
      <p>Room Type: ${roomType}</p>
      <p>Meal Option: ${mealOption}</p>
      <p>Number of Beds: ${numberOfBeds}</p>
      <p>Check-in Date: ${new Date(startDate).toLocaleDateString()}</p>
      <p>Check-out Date: ${new Date(endDate).toLocaleDateString()}</p>
      <p>Number of Nights: ${numberOfNights}</p>
      <p>Total Amount: ₹${priceDetails.totalAmount}</p>
      <p>You can pay 25% (₹${partialAmount}) now to confirm your booking, or pay the full amount.</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

    await sendEmail({
      email: user.email,
      subject: "HappyGo Hostel Booking Created",
      message: emailMessage,
    });

    return res.status(201).json({
      success: true,
      data: {
        ...booking.toObject(),
        paymentOptions: {
          partialPayment: {
            amount: partialAmount,
            percentage: partialPaymentPercentage
          },
          fullPayment: {
            amount: totalAmount,
            percentage: 100
          }
        }
      },
    });
  }
});

// @desc    Create booking from cart (handles bike + hostel together)
// @route   POST /api/bookings/cart
// @access  Private
export const createCartBooking = asyncHandler(async (req, res) => {
  const { guestDetails, specialRequests, partialPaymentPercentage = 25 } = req.body;

  // Validate partial payment percentage
  if (partialPaymentPercentage < 1 || partialPaymentPercentage > 100) {
    throw new ApiError("Partial payment percentage must be between 1 and 100", 400);
  }

  // Get user's active cart with populated data
  const cart = await Cart.findOne({
    user: req.user._id,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .populate("bikeItems.bike")
    .populate("hostelItems.hostel");

  if (!cart || (cart.bikeItems.length === 0 && cart.hostelItems.length === 0)) {
    throw new ApiError("Cart is empty. Please add items to cart before checkout.", 400);
  }

  // Generate unique payment group ID
  const paymentGroupId = `PG_${Date.now()}_${req.user._id}`;
  const createdBookings = [];
  let totalCartAmount = 0;

  // ===== CREATE BIKE BOOKING IF CART HAS BIKES =====
  if (cart.bikeItems.length > 0) {
    // Calculate bike pricing with GST
    const bikeSubtotal = cart.pricing.bikeSubtotal || 0;
    const helmetCharges = cart.helmetDetails?.charges || 0;
    const bikeBaseAmount = bikeSubtotal + helmetCharges;
    const bikeGst = Math.round((bikeBaseAmount * 5) / 100);
    const bikeTotalAmount = bikeBaseAmount + bikeGst;

    // Calculate number of days
    const startDate = new Date(cart.bikeDates.startDate);
    const endDate = new Date(cart.bikeDates.endDate);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalDays = daysDiff === 0 ? 1 : daysDiff + 1;

    const bikeBooking = await Booking.create({
      user: req.user._id,
      bookingType: "bike",
      bikeItems: cart.bikeItems.map((item) => ({
        bike: item.bike._id,
        quantity: item.quantity,
        kmOption: item.kmOption,
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.totalPrice,
        kmLimit: item.kmLimit,
        additionalKmPrice: item.additionalKmPrice || 5,
        bikeTitle: item.bike.title,
        bikeModel: item.bike.model,
        bikeBrand: item.bike.brand,
      })),
      startDate: cart.bikeDates.startDate,
      endDate: cart.bikeDates.endDate,
      startTime: cart.bikeDates.startTime,
      endTime: cart.bikeDates.endTime,
      helmetQuantity: cart.helmetDetails?.quantity || 0,
      priceDetails: {
        basePrice: bikeSubtotal,
        subtotal: bikeSubtotal,
        helmetCharges: helmetCharges,
        extraCharges: 0,
        taxes: bikeGst,
        gst: bikeGst,
        gstPercentage: 5,
        discount: 0,
        totalAmount: bikeTotalAmount,
      },
      bikeDetails: {
        totalDays: totalDays,
        kmOption: cart.bikeItems[0]?.kmOption || "unlimited",
      },
      guestDetails: guestDetails || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.mobile || req.user.phone,
      },
      specialRequests: specialRequests || "",
      paymentGroupId,
      bookingStatus: "pending",
      paymentStatus: "pending",
      paymentDetails: {
        totalAmount: bikeTotalAmount,
        paidAmount: 0,
        remainingAmount: bikeTotalAmount,
        partialPaymentPercentage,
        paymentHistory: [],
      },
    });

    // Update bike availability
    for (const item of cart.bikeItems) {
      const bike = await Bike.findById(item.bike._id);
      if (bike) {
        bike.availableQuantity = Math.max(0, bike.availableQuantity - item.quantity);
        if (bike.availableQuantity <= 0) {
          bike.status = "booked";
        }
        await bike.save();
      }
    }

    createdBookings.push({
      bookingId: bikeBooking._id,
      type: "bike",
      amount: bikeTotalAmount,
      breakdown: {
        basePrice: bikeSubtotal,
        helmetCharges: helmetCharges,
        gst: bikeGst,
        gstPercentage: 5,
        discount: 0,
        totalAmount: bikeTotalAmount,
      },
      dates: {
        pickupDate: cart.bikeDates.startDate,
        dropDate: cart.bikeDates.endDate,
        pickupTime: cart.bikeDates.startTime,
        dropTime: cart.bikeDates.endTime,
        totalDays: totalDays,
      },
      items: cart.bikeItems.map((item) => ({
        bikeName: item.bike.title,
        brand: item.bike.brand,
        model: item.bike.model,
        quantity: item.quantity,
        kmOption: item.kmOption,
        pricePerUnit: item.pricePerUnit,
      })),
      helmets: cart.helmetDetails?.quantity || 0,
    });

    totalCartAmount += bikeTotalAmount;
  }

  // ===== CREATE HOSTEL BOOKINGS IF CART HAS HOSTELS =====
  // Support multiple hostel items (different meal options, room types, etc.)
  if (cart.hostelItems.length > 0) {
    for (const hostelItem of cart.hostelItems) {
      // Calculate pricing for this specific hostel item
      const itemSubtotal = hostelItem.totalPrice;
      const itemGst = Math.round((itemSubtotal * 5) / 100);
      const itemTotalAmount = itemSubtotal + itemGst;

      const hostelBooking = await Booking.create({
        user: req.user._id,
        bookingType: "hostel",
        hostel: hostelItem.hostel._id,
        roomType: hostelItem.roomType,
        mealOption: hostelItem.mealOption,
        numberOfBeds: hostelItem.quantity,
        numberOfNights: hostelItem.numberOfNights,
        startDate: cart.hostelDates.checkIn,
        endDate: cart.hostelDates.checkOut,
        checkIn: cart.hostelDates.checkIn,
        checkOut: cart.hostelDates.checkOut,
        numberOfPeople: hostelItem.quantity,
        priceDetails: {
          basePrice: itemSubtotal,
          subtotal: itemSubtotal,
          taxes: itemGst,
          gst: itemGst,
          gstPercentage: 5,
          discount: 0,
          totalAmount: itemTotalAmount,
        },
        hostelDetails: {
          stayType: hostelItem.isWorkstation ? "workstation" : "hostel",
          checkInTime: "1:00 PM",
        },
        guestDetails: guestDetails || {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.mobile || req.user.phone,
        },
        specialRequests: specialRequests || "",
        paymentGroupId,
        bookingStatus: "pending",
        paymentStatus: "pending",
        paymentDetails: {
          totalAmount: itemTotalAmount,
          paidAmount: 0,
          remainingAmount: itemTotalAmount,
          partialPaymentPercentage,
          paymentHistory: [],
        },
      });

      // No need to update availableBeds - it's calculated dynamically on fetch

      createdBookings.push({
        bookingId: hostelBooking._id,
        type: "hostel",
        amount: itemTotalAmount,
        breakdown: {
          basePrice: itemSubtotal,
          gst: itemGst,
          gstPercentage: 5,
          discount: 0,
          totalAmount: itemTotalAmount,
        },
        dates: {
          checkIn: cart.hostelDates.checkIn,
          checkOut: cart.hostelDates.checkOut,
          nights: hostelItem.numberOfNights || 1,
        },
        hostelDetails: {
          hostelName: hostelItem.hostel.name,
          location: hostelItem.hostel.location,
          roomType: hostelItem.roomType,
          mealOption: hostelItem.mealOption,
          beds: hostelItem.quantity,
          pricePerNight: hostelItem.pricePerNight,
          isWorkstation: hostelItem.isWorkstation || false,
        },
      });

      totalCartAmount += itemTotalAmount;
    }
  }

  // ===== CREATE RAZORPAY ORDER FOR TOTAL AMOUNT =====
  const partialAmount = Math.round((totalCartAmount * partialPaymentPercentage) / 100);
  // console.log("totalCartAmount * partialPaymentPercentage", totalCartAmount ,partialPaymentPercentage);
  const remainingAmount = totalCartAmount - partialAmount;

  // Import Razorpay (should already be imported in payment controller)
  const Razorpay = (await import("razorpay")).default;
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const razorpayOrder = await razorpay.orders.create({
    amount: partialAmount * 100, // Convert to paise
    currency: "INR",
    receipt: `${paymentGroupId.substring(0, 30)}`, // Max 40 chars
    notes: {
      paymentGroupId,
      userId: req.user._id.toString(),
      bookingIds: createdBookings.map((b) => b.bookingId.toString()).join(","),
      partialPercentage: partialPaymentPercentage.toString(),
    },
  });

  // ===== ADD PAYMENT HISTORY TO ALL BOOKINGS (WITH PROPORTIONAL AMOUNTS) =====
  for (const bookingData of createdBookings) {
    // Calculate proportional amount for this specific booking
    const bookingProportion = bookingData.amount / totalCartAmount;
    const bookingProportionalAmount = Math.round(partialAmount * bookingProportion);

    await Booking.findByIdAndUpdate(bookingData.bookingId, {
      $push: {
        "paymentDetails.paymentHistory": {
          paymentId: `PENDING_${razorpayOrder.id}`,
          razorpayOrderId: razorpayOrder.id,
          amount: bookingProportionalAmount, // Proportional amount for this booking
          paymentType: partialPaymentPercentage === 100 ? "full" : "partial",
          status: "pending",
          createdAt: new Date(),
        },
      },
    });
  }

  // ===== CLEAR CART =====
  cart.bikeItems = [];
  cart.hostelItems = [];
  cart.bikeDates = {};
  cart.hostelDates = {};
  cart.pricing = {
    bikeSubtotal: 0,
    hostelSubtotal: 0,
    subtotal: 0,
    bulkDiscount: { amount: 0, percentage: 0 },
    surgeMultiplier: 1,
    extraCharges: 0,
    gst: 0,
    gstPercentage: 5,
    total: 0,
  };
  cart.helmetDetails = { quantity: 0, charges: 0 };
  await cart.save();

  // ===== RETURN RESPONSE =====
  res.status(201).json({
    success: true,
    data: {
      bookings: createdBookings,
      paymentGroupId,
      totalAmount: totalCartAmount,
      partialAmount,
      partialPercentage: partialPaymentPercentage,
      remainingAmount,
      razorpay: {
        orderId: razorpayOrder.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: partialAmount,
        currency: "INR",
      },
    },
    message: `${createdBookings.length} booking(s) created successfully. Please complete the payment.`,
  });
});

// @desc    Get all bookings (grouped by payment group)
// @route   GET /api/bookings
// @access  Private
export const getBookings = asyncHandler(async (req, res) => {
  const { type, status, limit = 10, page = 1, sort, grouped = 'true' } = req.query;

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

  // Fetch all bookings (for grouping logic)
  const allBookings = await Booking.find(query)
    .populate({
      path: "bike",
      select: "title brand model images",
    })
    .populate({
      path: "bikeItems.bike",
      select: "title brand model images",
    })
    .populate({
      path: "hostel",
      select: "name location images ratings",
    })
    .sort(sortOptions);

  let groupedData = [];
  
  if (grouped === 'true') {
    // Group bookings by paymentGroupId
    const bookingMap = new Map();
    const singleBookings = [];

    allBookings.forEach((booking) => {
      if (booking.paymentGroupId) {
        // Group by paymentGroupId
        if (!bookingMap.has(booking.paymentGroupId)) {
          bookingMap.set(booking.paymentGroupId, []);
        }
        bookingMap.get(booking.paymentGroupId).push(booking);
      } else {
        // No payment group - standalone booking
        singleBookings.push(booking);
      }
    });

    // Convert grouped bookings to array
    bookingMap.forEach((bookings, paymentGroupId) => {
      if (bookings.length > 1) {
        // Combined booking (multiple items)
        const combinedTotal = bookings.reduce(
          (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
          0
        );
        const combinedPaid = bookings.reduce(
          (sum, b) => sum + (b.paymentDetails?.paidAmount || 0),
          0
        );
        const combinedRemaining = bookings.reduce(
          (sum, b) => sum + (b.paymentDetails?.remainingAmount || 0),
          0
        );

        groupedData.push({
          isCombined: true,
          paymentGroupId: paymentGroupId,
          bookingType: "combined",
          bookings: bookings.map((b) => b.toObject()),
          combinedDetails: {
            totalAmount: combinedTotal,
            paidAmount: combinedPaid,
            remainingAmount: combinedRemaining,
            bookingCount: bookings.length,
            types: [...new Set(bookings.map((b) => b.bookingType))],
          },
          paymentStatus: bookings.every((b) => b.paymentStatus === "completed")
            ? "completed"
            : bookings.some((b) => b.paymentStatus === "partial")
            ? "partial"
            : "pending",
          bookingStatus: bookings.every((b) => b.bookingStatus === "confirmed")
            ? "confirmed"
            : bookings.some((b) => b.bookingStatus === "cancelled")
            ? "cancelled"
            : "pending",
          createdAt: bookings[0].createdAt,
          startDate: bookings[0].startDate || bookings[0].checkIn,
          endDate: bookings[bookings.length - 1].endDate || bookings[bookings.length - 1].checkOut,
        });
      } else {
        // Single booking with payment group (shouldn't happen, but handle it)
        singleBookings.push(bookings[0]);
      }
    });

    // Add single bookings
    singleBookings.forEach((booking) => {
      groupedData.push({
        isCombined: false,
        ...booking.toObject(),
      });
    });

    // Sort grouped data by creation date
    groupedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    // Return ungrouped (legacy behavior)
    groupedData = allBookings.map((b) => ({
      isCombined: false,
      ...b.toObject(),
    }));
  }

  // Apply pagination to grouped data
  const total = groupedData.length;
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);
  const paginatedData = groupedData.slice(skip, skip + Number.parseInt(limit));

  res.status(200).json({
    success: true,
    count: paginatedData.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: paginatedData,
  });
});

// @desc    Get bookings by payment group ID
// @route   GET /api/bookings/group/:paymentGroupId
// @access  Private
export const getBookingsByPaymentGroup = asyncHandler(async (req, res) => {
  const { paymentGroupId } = req.params;

  const bookings = await Booking.find({ paymentGroupId })
    .populate({
      path: "bike",
      select: "title brand model images pricePerDay registrationNumber",
    })
    .populate({
      path: "bikeItems.bike",
      select: "title brand model images pricePerDay registrationNumber",
    })
    .populate({
      path: "hostel",
      select: "name location images rooms ratings",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    });

  if (bookings.length === 0) {
    throw new ApiError("No bookings found for this payment group", 404);
  }

  // Check authorization - at least one booking should belong to user
  const userBooking = bookings.find(
    (booking) => booking.user._id.toString() === req.user._id.toString()
  );

  if (!userBooking && req.user.role !== "admin") {
    throw new ApiError("Not authorized to access these bookings", 401);
  }

  // Calculate combined totals
  const combinedTotals = {
    totalAmount: bookings.reduce((sum, b) => sum + (b.priceDetails?.totalAmount || 0), 0),
    paidAmount: bookings[0]?.paymentDetails?.paidAmount || 0,
    remainingAmount: bookings[0]?.paymentDetails?.remainingAmount || 0,
    partialPaymentPercentage: bookings[0]?.paymentDetails?.partialPaymentPercentage || 25,
  };

  // Enhanced bookings with computed details
  const enhancedBookings = bookings.map((booking) => {
    const enhanced = booking.toObject();
    
    if (booking.bookingType === "bike") {
      const startDateTime = new Date(
        `${booking.startDate.toISOString().split("T")[0]}T${booking.startTime}`
      );
      const endDateTime = new Date(
        `${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`
      );
      const durationInHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      
      enhanced.computedDetails = {
        durationInHours: Math.round(durationInHours * 100) / 100,
        durationInDays: Math.ceil(durationInHours / 24),
      };
    } else if (booking.bookingType === "hostel") {
      const checkIn = new Date(booking.checkIn || booking.startDate);
      const checkOut = new Date(booking.checkOut || booking.endDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      
      enhanced.computedDetails = {
        nights: nights,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      };
    }
    
    return enhanced;
  });

  res.status(200).json({
    success: true,
    data: {
      paymentGroupId,
      bookings: enhancedBookings,
      combinedTotals,
      bookingCount: bookings.length,
      allConfirmed: bookings.every((b) => b.bookingStatus === "confirmed"),
      paymentCompleted: bookings.every((b) => b.paymentStatus === "completed"),
    },
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: "bike",
      select: "title brand model images location registrationNumber",
    })
    .populate({
      path: "bikeItems.bike",
      select: "title brand model images location registrationNumber",
    })
    .populate({
      path: "hostel",
      select: "name location images ratings checkInTime checkOutTime address contactInfo",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    });

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking belongs to user
  if (
    booking.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "employee"
  ) {
    throw new ApiError("Not authorized to access this booking", 401);
  }

  // Check if this is part of a combined booking and calculate correct payment amounts
  let paymentInfo;
  let combinedInfo = null;
  
  if (booking.paymentGroupId) {
    const relatedBookings = await Booking.find({
      paymentGroupId: booking.paymentGroupId,
      _id: { $ne: booking._id },
    }).select("_id bookingType priceDetails paymentDetails");

    if (relatedBookings.length > 0) {
      // This is a COMBINED booking
      const allBookings = [booking, ...relatedBookings];
      
      // Calculate combined total
      const combinedTotal = allBookings.reduce(
        (sum, b) => sum + (b.priceDetails?.totalAmount || 0),
        0
      );

      // Get ACTUAL paid amount from payment history (not from DB paidAmount field)
      // Find completed payments and sum their amounts (they should already be proportional)
      let actualPaidAmount = 0;
      const paymentHistory = booking.paymentDetails?.paymentHistory || [];
      
      for (const payment of paymentHistory) {
        if (payment.status === "completed") {
          actualPaidAmount += payment.amount || 0;
        }
      }

      const combinedRemaining = combinedTotal - actualPaidAmount;

      // Calculate proportional payment for THIS booking
      const thisBookingTotal = booking.priceDetails.totalAmount;
      const proportion = thisBookingTotal / combinedTotal;
      const proportionalPaid = Math.round(actualPaidAmount * proportion);
      const proportionalRemaining = thisBookingTotal - proportionalPaid;

      paymentInfo = {
        total: combinedTotal,
        paid: actualPaidAmount,
        remaining: combinedRemaining,
        percentage: booking.paymentDetails.partialPaymentPercentage || 25,
        method: booking.paymentId ? "online" : "pending",
        breakdown: {
          thisBooking: {
            total: thisBookingTotal,
            paid: proportionalPaid,
            remaining: proportionalRemaining,
          },
          otherBookings: relatedBookings.map((b) => ({
            id: b._id,
            type: b.bookingType,
            total: b.priceDetails?.totalAmount || 0,
            paid: Math.round(actualPaidAmount * ((b.priceDetails?.totalAmount || 0) / combinedTotal)),
          })),
        },
      };

      combinedInfo = {
        isCombined: true,
        paymentGroupId: booking.paymentGroupId,
        totalBookings: allBookings.length,
        otherBookings: relatedBookings.map((b) => ({
          id: b._id,
          type: b.bookingType,
          amount: b.priceDetails?.totalAmount || 0,
        })),
      };
    } else {
      // Has paymentGroupId but no other bookings (shouldn't happen)
      paymentInfo = {
        total: booking.priceDetails.totalAmount,
        paid: booking.paymentDetails.paidAmount,
        remaining: booking.paymentDetails.remainingAmount,
        percentage: booking.paymentDetails.partialPaymentPercentage || 25,
        method: booking.paymentId ? "online" : "pending",
      };
    }
  } else {
    // Single booking (no group)
    paymentInfo = {
      total: booking.priceDetails.totalAmount,
      paid: booking.paymentDetails.paidAmount,
      remaining: booking.paymentDetails.remainingAmount,
      percentage: booking.paymentDetails.partialPaymentPercentage || 25,
      method: booking.paymentId ? "online" : "pending",
    };
  }

  // If this is a COMBINED booking, fetch ALL bookings in the group
  let allGroupBookings = [];
  if (booking.paymentGroupId) {
    allGroupBookings = await Booking.find({
      paymentGroupId: booking.paymentGroupId,
    })
      .populate("bike")
      .populate("bikeItems.bike")
      .populate("hostel")
      .sort({ bookingType: 1 }); // bike first, then hostel
  }

  // Build clean response
  const response = {
    // Basic Info
    paymentGroupId: booking.paymentGroupId,
    isCombined: booking.paymentGroupId && allGroupBookings.length > 1,
    status: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    bookedOn: booking.createdAt,
    
    // Combined Payment Summary
    paymentSummary: {
      totalAmount: paymentInfo.total,
      paidAmount: paymentInfo.paid,
      remainingAmount: paymentInfo.remaining,
      partialPercentage: paymentInfo.percentage,
      partialAmount: Math.round((paymentInfo.total * paymentInfo.percentage) / 100),
      paymentMethod: paymentInfo.method,
    },

    // All Bookings (bikes and hostels)
    bookings: allGroupBookings.length > 0 ? allGroupBookings.map((b) => {
      const bookingData = {
        id: b._id,
        type: b.bookingType,
        
        // Price Breakdown
        priceBreakdown: {
          basePrice: b.priceDetails.basePrice || b.priceDetails.subtotal,
          ...(b.priceDetails.helmetCharges && { helmetCharges: b.priceDetails.helmetCharges }),
          ...(b.priceDetails.discount && { discount: b.priceDetails.discount }),
          gst: b.priceDetails.gst || b.priceDetails.taxes,
          gstPercentage: b.priceDetails.gstPercentage || 5,
          totalAmount: b.priceDetails.totalAmount,
        },
      };

      // Add bike-specific details
      if (b.bookingType === "bike") {
        bookingData.bike = {
          items: b.bikeItems.map((item) => ({
            id: item.bike._id,
            name: item.bike.title,
            brand: item.bike.brand,
            model: item.bike.model,
            images: item.bike.images,
            quantity: item.quantity,
            kmOption: item.kmOption,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
          })),
          helmets: b.helmetQuantity || 0,
        };
        bookingData.dates = {
          pickupDate: b.startDate,
          dropDate: b.endDate,
          pickupTime: b.startTime,
          dropTime: b.endTime,
          totalDays: b.bikeDetails?.totalDays || 1,
        };
      }

      // Add hostel-specific details
      if (b.bookingType === "hostel" && b.hostel) {
        bookingData.hostel = {
          id: b.hostel._id,
          name: b.hostel.name,
          location: b.hostel.location,
          images: b.hostel.images,
          rating: b.hostel.ratings,
          checkInTime: b.hostel.checkInTime,
          checkOutTime: b.hostel.checkOutTime,
          address: b.hostel.address,
          contact: b.hostel.contactInfo,
          roomType: b.roomType,
          mealOption: b.mealOption,
          beds: b.numberOfBeds,
          nights: b.numberOfNights,
          pricePerNight: (b.priceDetails.basePrice || b.priceDetails.subtotal) / (b.numberOfNights || 1),
          isWorkstation: b.hostelDetails?.stayType === "workstation",
        };
        bookingData.dates = {
          checkIn: b.checkIn || b.startDate,
          checkOut: b.checkOut || b.endDate,
          nights: b.numberOfNights || 1,
        };
      }

      return bookingData;
    }) : [
      // Single booking (no group)
      {
        id: booking._id,
        type: booking.bookingType,
        priceBreakdown: {
          basePrice: booking.priceDetails.basePrice || booking.priceDetails.subtotal,
          ...(booking.priceDetails.helmetCharges && { helmetCharges: booking.priceDetails.helmetCharges }),
          ...(booking.priceDetails.discount && { discount: booking.priceDetails.discount }),
          gst: booking.priceDetails.gst || booking.priceDetails.taxes,
          gstPercentage: booking.priceDetails.gstPercentage || 5,
          totalAmount: booking.priceDetails.totalAmount,
        },
        ...(booking.bookingType === "bike" && {
          bike: {
            items: booking.bikeItems.map((item) => ({
              id: item.bike._id,
              name: item.bike.title,
              brand: item.bike.brand,
              model: item.bike.model,
              images: item.bike.images,
              quantity: item.quantity,
              kmOption: item.kmOption,
              pricePerUnit: item.pricePerUnit,
              totalPrice: item.totalPrice,
            })),
            helmets: booking.helmetQuantity || 0,
          },
          dates: {
            pickupDate: booking.startDate,
            dropDate: booking.endDate,
            pickupTime: booking.startTime,
            dropTime: booking.endTime,
            totalDays: booking.bikeDetails?.totalDays || 1,
          },
        }),
        ...(booking.bookingType === "hostel" && {
          hostel: {
            id: booking.hostel._id,
            name: booking.hostel.name,
            location: booking.hostel.location,
            images: booking.hostel.images,
            rating: booking.hostel.ratings,
            checkInTime: booking.hostel.checkInTime,
            checkOutTime: booking.hostel.checkOutTime,
            address: booking.hostel.address,
            contact: booking.hostel.contactInfo,
            roomType: booking.roomType,
            mealOption: booking.mealOption,
            beds: booking.numberOfBeds,
            nights: booking.numberOfNights,
            pricePerNight: (booking.priceDetails.basePrice || booking.priceDetails.subtotal) / (booking.numberOfNights || 1),
            isWorkstation: booking.hostelDetails?.stayType === "workstation",
          },
          dates: {
            checkIn: booking.checkIn || booking.startDate,
            checkOut: booking.checkOut || booking.endDate,
            nights: booking.numberOfNights || 1,
          },
        }),
      }
    ],

    // Guest Info
    guest: {
      name: booking.guestDetails?.name || booking.user.name,
      email: booking.guestDetails?.email || booking.user.email,
      phone: booking.guestDetails?.phone || booking.user.mobile,
    },

    // Actions
    actions: {
      canPay: booking.paymentStatus !== "completed" && booking.bookingStatus !== "cancelled",
      canCancel: booking.bookingStatus === "pending" || booking.bookingStatus === "confirmed",
    },

    // Special Requests
    ...(booking.specialRequests && { notes: booking.specialRequests }),
  };

  res.status(200).json({
    success: true,
    data: response,
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

    // If bike booking is cancelled, increase available quantity
    if (booking.bookingType === "bike" && booking.bike) {
      const bike = await Bike.findById(booking.bike);
      if (bike) {
        bike.availableQuantity += 1;

        // Update status if needed
        if (bike.status === "booked" && bike.availableQuantity > 0) {
          bike.status = "available";
        }

        await bike.save();
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
  booking.bikeDetails.documentsSubmitted = {
    idProof: idProof || booking.bikeDetails.documentsSubmitted?.idProof,
    drivingLicense:
      drivingLicense || booking.bikeDetails.documentsSubmitted?.drivingLicense,
    addressProof:
      addressProof || booking.bikeDetails.documentsSubmitted?.addressProof,
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

// @desc    Get hostel bookings
// @route   GET /api/bookings/hostels
// @access  Private
export const getHostelBookings = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query;

  // Build query for hostel bookings
  const query = {
    user: req.user._id,
    bookingType: "hostel",
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
      path: "hostel",
      select: "name location images ratings rooms",
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
      path: "bike",
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

// @desc    Update hostel booking details
// @route   PUT /api/bookings/:id/hostel-details
// @access  Private
export const updateHostelBookingDetails = asyncHandler(async (req, res) => {
  const { checkInTime, specialRequests, numberOfBeds, mealOption } = req.body;

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

  // Check if booking is for hostel
  if (booking.bookingType !== "hostel") {
    throw new ApiError("This endpoint is only for hostel bookings", 400);
  }

  // Only allow updates if booking is pending
  if (booking.bookingStatus !== "pending") {
    throw new ApiError("Cannot update booking details after confirmation", 400);
  }

  // Update hostel details
  if (checkInTime) {
    if (!booking.hostelDetails) {
      booking.hostelDetails = {};
    }
    booking.hostelDetails.checkInTime = checkInTime;
  }

  if (specialRequests) {
    booking.specialRequests = specialRequests;
  }

  if (numberOfBeds && numberOfBeds !== booking.numberOfBeds) {
    // Validate bed availability if changing number of beds
    booking.numberOfBeds = numberOfBeds;
  }

  if (mealOption && ["bedOnly", "bedAndBreakfast", "bedBreakfastAndDinner"].includes(mealOption)) {
    booking.mealOption = mealOption;
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
  const totalHostelBookings = await Booking.countDocuments({
    bookingType: "hostel",
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
  const hostelRevenue =
    revenueStats.find((item) => item._id === "hostel")?.totalRevenue || 0;
  const totalRevenue = bikeRevenue + hostelRevenue;

  res.status(200).json({
    success: true,
    data: {
      totalBookings: totalBikeBookings + totalHostelBookings,
      byType: {
        bike: totalBikeBookings,
        hostel: totalHostelBookings,
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
        hostel: hostelRevenue,
      },
    },
  });
});

// @desc    Extend bike booking
// @route   PUT /api/bookings/:id/extend
// @access  Private/Employee
export const extendBikeBooking = asyncHandler(async (req, res) => {
  const { newEndDate, newEndTime, reason } = req.body;

  if (!newEndDate || !newEndTime) {
    throw new ApiError("Please provide new end date and time", 400);
  }

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking is for bike
  if (booking.bookingType !== "bike") {
    throw new ApiError("Only bike bookings can be extended", 400);
  }

  // Check if booking is confirmed
  if (booking.bookingStatus !== "confirmed") {
    throw new ApiError("Only confirmed bookings can be extended", 400);
  }

  if (booking.user.toString() !== req.user._id.toString() && !req?.employee) {
    throw new ApiError("Not authorized to extend this booking", 401);
  }

  // Check if new end date is after current end date
  const currentEndDate = new Date(
    `${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`
  );
  const proposedEndDate = new Date(`${newEndDate}T${newEndTime}`);

  if (proposedEndDate <= currentEndDate) {
    throw new ApiError("New end date must be after current end date", 400);
  }

  // Check if bike is available for the extended period
  const bike = await Bike.findById(booking.bike);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Check for conflicting bookings in the extended period
  const conflictingBookings = await Booking.find({
    bookingType: "bike",
    bike: booking.bike,
    _id: { $ne: booking._id }, // Exclude current booking
    startDate: { $lte: proposedEndDate },
    endDate: { $gte: currentEndDate },
    bookingStatus: { $nin: ["cancelled"] },
  });

  if (conflictingBookings.length >= bike.availableQuantity) {
    console.log(
      "🚀 ~ extendBikeBooking ~ conflictingBookings:",
      conflictingBookings.length,
      bike.availableQuantity
    );
    throw new ApiError("Bike is not available for the extended period", 400);
  }

  // Calculate additional charges
  const currentDuration = Math.ceil(
    (currentEndDate - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  );
  const newDuration = Math.ceil(
    (proposedEndDate - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  );
  const additionalDays = newDuration - currentDuration;

  let additionalAmount = 0;

  if (booking.bikeDetails.isUnlimited) {
    additionalAmount = additionalDays * bike.pricePerDay.unlimited.price;
  } else {
    additionalAmount = additionalDays * bike.pricePerDay.limitedKm.price;
  }

  // Update booking
  booking.endDate = newEndDate;
  booking.endTime = newEndTime;

  // Update price details
  booking.priceDetails.basePrice += additionalAmount;
  booking.priceDetails.taxes = (booking.priceDetails.basePrice * 0.18).toFixed(
    2
  ); // Assuming 18% tax
  booking.priceDetails.totalAmount = (
    Number.parseFloat(booking.priceDetails.basePrice) +
    Number.parseFloat(booking.priceDetails.taxes) -
    Number.parseFloat(booking.priceDetails.discount || 0)
  ).toFixed(2);

  // Add extension note
  booking.extensionHistory = booking.extensionHistory || [];
  booking.extensionHistory.push({
    previousEndDate: booking.endDate,
    previousEndTime: booking.endTime,
    newEndDate,
    newEndTime,
    additionalAmount,
    reason,
    extendedBy: req?.employee?._id || req?.user?._id,
    extendedAt: new Date(),
  });

  await booking.save();

  // Send notification email to user
  const user = await User.findById(booking.user);

  if (user) {
    const emailMessage = `
      <h1>Booking Extension Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your bike booking (ID: ${booking._id}) has been extended.</p>
      <p>New End Date: ${new Date(
        newEndDate
      ).toLocaleDateString()} at ${newEndTime}</p>
      <p>Additional Amount: ₹${additionalAmount}</p>
      <p>New Total Amount: ₹${booking.priceDetails.totalAmount}</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

    await sendEmail({
      email: user.email,
      subject: "HappyGo Booking Extension Confirmation",
      message: emailMessage,
    });
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Complete bike booking
// @route   PUT /api/bookings/:id/complete
// @access  Private/Employee
export const completeBikeBooking = asyncHandler(async (req, res) => {
  const { finalKmReading, notes } = req.body;

  // Get booking
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError("Booking not found", 404);
  }

  // Check if booking is for bike
  if (booking.bookingType !== "bike") {
    throw new ApiError("Only bike bookings can be completed", 400);
  }

  // Check if booking is confirmed
  if (booking.bookingStatus !== "confirmed") {
    throw new ApiError("Only confirmed bookings can be completed", 400);
  }

  // Get bike
  const bike = await Bike.findById(booking.bike);

  if (!bike) {
    throw new ApiError("Bike not found", 404);
  }

  // Check if booking is overdue
  const currentEndDate = new Date(
    `${booking.endDate.toISOString().split("T")[0]}T${booking.endTime}`
  );
  const now = new Date();
  const isOverdue = now > currentEndDate;

  // Calculate extra time if overdue
  let extraHours = 0;
  let extraDays = 0;
  let overdueCharges = 0;

  if (isOverdue) {
    const timeDiff = now - currentEndDate;
    extraHours = Math.ceil(timeDiff / (1000 * 60 * 60));
    extraDays = Math.ceil(extraHours / 24);

    // Calculate overdue charges (1.5x the daily rate)
    if (booking.bikeDetails.isUnlimited) {
      overdueCharges = (
        extraDays *
        bike.pricePerDay.unlimited.price *
        1.5
      ).toFixed(2);
    } else {
      overdueCharges = (
        extraDays *
        bike.pricePerDay.limitedKm.price *
        1.5
      ).toFixed(2);
    }
  }

  // Calculate additional km charges if applicable
  let kmCharges = 0;
  let additionalKm = 0; // Declare additionalKm here

  if (finalKmReading && !booking.bikeDetails.isUnlimited) {
    const initialKmReading = booking.bikeDetails.initialKmReading || 0;
    const kmTravelled = finalKmReading - initialKmReading;
    const kmLimit = booking.bikeDetails.kmLimit;

    additionalKm = Math.max(0, kmTravelled - kmLimit);

    if (additionalKm > 0) {
      kmCharges = (additionalKm * bike.additionalKmPrice).toFixed(2);
    }

    booking.bikeDetails.finalKmReading = finalKmReading;
  }

  // Update booking
  booking.bookingStatus = "completed";
  booking.completedAt = now;
  booking.completedBy = req.employee._id;

  if (notes) {
    booking.completionNotes = notes;
  }

  // Add overdue information if applicable
  if (isOverdue) {
    booking.overdueInfo = {
      extraHours,
      extraDays,
      overdueCharges,
      actualReturnDate: now,
    };
  }

  // Update additional charges
  booking.bikeDetails.additionalCharges = {
    amount: Number.parseFloat(overdueCharges) + Number.parseFloat(kmCharges),
    reason: `${
      isOverdue ? `Overdue by ${extraDays} days (₹${overdueCharges})` : ""
    } ${
      kmCharges > 0 ? `Additional ${additionalKm} km (₹${kmCharges})` : ""
    }`.trim(),
  };

  // Update total amount
  booking.priceDetails.totalAmount = (
    Number.parseFloat(booking.priceDetails.totalAmount) +
    Number.parseFloat(overdueCharges) +
    Number.parseFloat(kmCharges)
  ).toFixed(2);

  await booking.save();

  // Update bike availability
  bike.availableQuantity += 1;

  // Update status if needed
  if (bike.status === "booked" && bike.availableQuantity > 0) {
    bike.status = "available";
  }

  await bike.save();

  // Send completion email to user
  const user = await User.findById(booking.user);

  if (user) {
    const emailMessage = `
      <h1>Booking Completion Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your bike booking (ID: ${booking._id}) has been completed.</p>
      <p>Return Date: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}</p>
      ${
        isOverdue
          ? `<p>Your booking was overdue by ${extraDays} days. Overdue charges: ₹${overdueCharges}</p>`
          : ""
      }
      ${kmCharges > 0 ? `<p>Additional km charges: ₹${kmCharges}</p>` : ""}
      <p>Final Total Amount: ₹${booking.priceDetails.totalAmount}</p>
      <p>Thank you for choosing HappyGo!</p>
    `;

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
      path: "bike",
      select: "title brand model images",
    })
    .populate({
      path: "hostel",
      select: "name location images ratings",
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
      startDate: booking.startDate || booking.checkIn,
      endDate: booking.endDate || booking.checkOut,
      createdAt: booking.createdAt,
      totalAmount: booking.priceDetails.totalAmount,
      customerName: booking.user?.name || "Unknown User",
      itemName:
        booking.bookingType === "bike"
          ? booking.bike?.title || "Bike"
          : booking.hostel?.name || "Hostel",
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
      path: "bike",
      select:
        "title brand model images pricePerDay additionalKmPrice registrationNumber",
    })
    .populate({
      path: "hostel",
      select: "name location images rooms ratings checkInTime checkOutTime",
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

    // If bike booking is cancelled, increase available quantity
    if (booking.bookingType === "bike" && booking.bike) {
      const bike = await Bike.findById(booking.bike);
      if (bike) {
        bike.availableQuantity += 1;

        // Update status if needed
        if (bike.status === "booked" && bike.availableQuantity > 0) {
          bike.status = "available";
        }

        await bike.save();
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
  const { bookingId } = req.params;
  const { newEndDate, newEndTime } = req.body;

  if (!bookingId || !newEndDate) {
    throw new ApiError(400, "Booking ID and new end date are required");
  }

  if (!newEndTime) {
    throw new ApiError(400, "New end time is required");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Create date objects with time for comparison
  const currentEndDateTime = new Date(booking.endDate);
  if (booking.endTime) {
    const [hours, minutes] = booking.endTime.split(":").map(Number);
    currentEndDateTime.setHours(hours, minutes, 0);
  }

  // Parse the new end date and time
  const extendedEndDate = new Date(newEndDate);
  const [hours, minutes] = newEndTime.split(":").map(Number);
  extendedEndDate.setHours(hours, minutes, 0);

  if (extendedEndDate <= currentEndDateTime) {
    throw new ApiError(
      400,
      "New end date and time must be after current end date and time"
    );
  }

  // Check if the bike is already booked for the extended period
  console.log("🚀 ~ extendBooking ~ booking:", booking.bike, booking);
  const bike = await Bike.findById(booking.bike);
  console.log("🚀 ~ extendBooking ~ bike:", bike);
  if (!bike) {
    throw new ApiError(404, "Bike not found");
  }

  // Find any overlapping bookings
  const overlappingBookings = await Booking.find({
    bikeId: booking.bikeId,
    _id: { $ne: booking._id }, // Exclude current booking
    status: { $nin: ["cancelled", "rejected"] },
    startDate: { $lt: extendedEndDate },
    endDate: { $gt: currentEndDateTime },
  });

  if (overlappingBookings.length > 0) {
    throw new ApiError(
      400,
      "Cannot extend booking as bike is already booked for the requested period"
    );
  }

  // Calculate additional amount with more precision (including partial days)
  const startDateTime = new Date(booking.startDate);
  if (booking.startTime) {
    const [startHours, startMinutes] = booking.startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes, 0);
  }

  // Calculate duration in milliseconds and convert to days (including partial days)
  const originalDurationMs = currentEndDateTime - startDateTime;
  const newDurationMs = extendedEndDate - startDateTime;

  // Convert to days (including fractional days)
  const originalDuration = originalDurationMs / (1000 * 60 * 60 * 24);
  const newDuration = newDurationMs / (1000 * 60 * 60 * 24);
  const additionalDays = newDuration - originalDuration;

  // Calculate daily rate from original booking
  const dailyRate = booking.totalAmount / originalDuration;
  const additionalAmount = dailyRate * additionalDays;
  const newTotalAmount = booking.totalAmount + additionalAmount;

  // Update booking
  booking.endDate = newEndDate; // Store as date string
  booking.endTime = newEndTime; // Store time separately
  booking.totalAmount = newTotalAmount;
  booking.updatedAt = Date.now();

  // Add extension information to booking history
  if (!booking.history) {
    booking.history = [];
  }

  console.log("🚀 ~ extendBooking ~ req.user:", req.employee);
  booking.history.push({
    action: "extended",
    timestamp: Date.now(),
    details: `Booking extended to ${newEndDate} ${newEndTime}. Additional amount: ₹${additionalAmount.toFixed(
      2
    )}`,
    performedBy: req.employee._id,
  });

  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking extended successfully",
    booking,
    additionalAmount,
    newTotalAmount,
  });
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

  // No need to restore availability - it's calculated dynamically based on active bookings
  // Cancelled bookings are excluded from availability calculations

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
