import Place from "../models/place.model.js"
import Itinerary from "../models/itinerary.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

// @desc    Get all places
// @route   GET /api/places
// @access  Public
export const getPlaces = asyncHandler(async (req, res) => {
  const { search, category, limit = 10, page = 1, sort } = req.query

  // Build query
  const query = { isActive: true }

  // Search
  if (search) {
    query.$text = { $search: search }
  }

  // Filter by category
  if (category) {
    query.category = category
  }

  // Count total documents
  const total = await Place.countDocuments(query)

  // Build sort options
  let sortOptions = {}
  if (sort) {
    const sortFields = sort.split(",")
    sortFields.forEach((field) => {
      const sortOrder = field.startsWith("-") ? -1 : 1
      const fieldName = field.startsWith("-") ? field.substring(1) : field
      sortOptions[fieldName] = sortOrder
    })
  } else {
    sortOptions = { createdAt: -1 }
  }

  // Pagination
  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

  // Execute query
  const places = await Place.find(query).sort(sortOptions).skip(skip).limit(Number.parseInt(limit))

  res.status(200).json({
    success: true,
    count: places.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: places,
  })
})

// @desc    Get single place
// @route   GET /api/places/:id
// @access  Public
export const getPlace = asyncHandler(async (req, res) => {
  const place = await Place.findById(req.params.id)

  if (!place) {
    throw new ApiError("Place not found", 404)
  }

  res.status(200).json({
    success: true,
    data: place,
  })
})

// @desc    Create new place
// @route   POST /api/places
// @access  Private/Admin
export const createPlace = asyncHandler(async (req, res) => {
  const place = await Place.create(req.body)

  res.status(201).json({
    success: true,
    data: place,
  })
})

// @desc    Update place
// @route   PUT /api/places/:id
// @access  Private/Admin
export const updatePlace = asyncHandler(async (req, res) => {
  let place = await Place.findById(req.params.id)

  if (!place) {
    throw new ApiError("Place not found", 404)
  }

  place = await Place.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: place,
  })
})

// @desc    Delete place
// @route   DELETE /api/places/:id
// @access  Private/Admin
export const deletePlace = asyncHandler(async (req, res) => {
  const place = await Place.findById(req.params.id)

  if (!place) {
    throw new ApiError("Place not found", 404)
  }

  await place.deleteOne()

  res.status(200).json({
    success: true,
    data: {},
  })
})

// @desc    Get itinerary suggestions
// @route   GET /api/places/itinerary
// @access  Private
export const getItinerarySuggestions = asyncHandler(async (req, res) => {
  const { days, location } = req.query

  // Validate required fields
  if (!days) {
    throw new ApiError("Please provide number of days", 400)
  }

  const numDays = Number.parseInt(days)

  // Find existing itinerary or create a new one
  let itinerary

  if (location) {
    itinerary = await Itinerary.findOne({
      location: { $regex: location, $options: "i" },
      duration: numDays,
      isActive: true,
    }).populate({
      path: "dayPlans.places.place",
      select: "name description location images category recommendedDuration coordinates",
    })
  }

  // If no existing itinerary, create a custom one
  if (!itinerary) {
    // Find popular places
    const places = await Place.find({ isActive: true })
      .sort({ ratings: -1 })
      .limit(numDays * 3) // 3 places per day

    if (places.length === 0) {
      throw new ApiError("No places found to create an itinerary", 404)
    }

    // Create day plans
    const dayPlans = []
    for (let i = 0; i < numDays; i++) {
      const dayPlaces = places.slice(i * 3, (i + 1) * 3)

      const placesForDay = dayPlaces.map((place) => ({
        place: place._id,
        duration: place.recommendedDuration,
        startTime: "09:00",
        endTime: "18:00",
      }))

      dayPlans.push({
        day: i + 1,
        places: placesForDay,
      })
    }

    // Create custom itinerary
    itinerary = {
      title: `${numDays}-Day Custom Itinerary`,
      description: `A custom ${numDays}-day itinerary with popular places`,
      location: location || "Custom Location",
      duration: numDays,
      dayPlans: dayPlans.map((day) => ({
        day: day.day,
        places: day.places.map((place) => ({
          place: places.find((p) => p._id.toString() === place.place.toString()),
          duration: place.duration,
          startTime: place.startTime,
          endTime: place.endTime,
        })),
      })),
    }
  }

  res.status(200).json({
    success: true,
    data: itinerary,
  })
})

