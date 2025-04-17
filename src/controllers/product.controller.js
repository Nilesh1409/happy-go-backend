import Product from "../models/product.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const { search, category, limit = 10, page = 1, sort, isBestseller } = req.query

  // Build query
  const query = {}

  // Search
  if (search) {
    query.$text = { $search: search }
  }

  // Filter by category
  if (category) {
    query.category = category
  }

  // Filter by bestseller
  if (isBestseller) {
    query.isBestseller = isBestseller === "true"
  }

  // Count total documents
  const total = await Product.countDocuments(query)

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
  const products = await Product.find(query).sort(sortOptions).skip(skip).limit(Number.parseInt(limit))

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: products,
  })
})

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    throw new ApiError("Product not found", 404)
  }

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body)

  res.status(201).json({
    success: true,
    data: product,
  })
})

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id)

  if (!product) {
    throw new ApiError("Product not found", 404)
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: product,
  })
})

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    throw new ApiError("Product not found", 404)
  }

  await product.deleteOne()

  res.status(200).json({
    success: true,
    data: {},
  })
})

