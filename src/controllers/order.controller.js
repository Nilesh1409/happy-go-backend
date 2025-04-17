import Order from "../models/order.model.js"
import Product from "../models/product.model.js"
import User from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { sendEmail } from "../utils/sendEmail.js"
import { sendSMS } from "../utils/sendSMS.js"

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { products, deliveryAddress, priceDetails, couponCode, estimatedDeliveryDate } = req.body

  // Validate required fields
  if (!products || !products.length || !deliveryAddress || !priceDetails || !estimatedDeliveryDate) {
    throw new ApiError("Please provide all required fields", 400)
  }

  // Check if products exist and have sufficient stock
  for (const item of products) {
    const product = await Product.findById(item.product)

    if (!product) {
      throw new ApiError(`Product ${item.product} not found`, 404)
    }

    if (product.stock < item.quantity) {
      throw new ApiError(`Insufficient stock for ${product.title}`, 400)
    }

    // Update stock
    product.stock -= item.quantity
    await product.save()
  }

  // Create order
  const order = await Order.create({
    user: req.user._id,
    products,
    deliveryAddress,
    priceDetails,
    couponCode,
    estimatedDeliveryDate,
  })

  // Populate product details
  const populatedOrder = await Order.findById(order._id).populate({
    path: "products.product",
    select: "title images",
  })

  // Send confirmation email
  const user = await User.findById(req.user._id)

  const emailMessage = `
    <h1>Order Confirmation</h1>
    <p>Dear ${user.name},</p>
    <p>Your order has been confirmed.</p>
    <p>Order ID: ${order._id}</p>
    <p>Total Amount: ₹${priceDetails.totalAmount}</p>
    <p>Estimated Delivery Date: ${new Date(estimatedDeliveryDate).toLocaleDateString()}</p>
    <p>Thank you for shopping with HappyGo!</p>
  `

  await sendEmail({
    email: user.email,
    subject: "HappyGo Order Confirmation",
    message: emailMessage,
  })

  // Send confirmation SMS
  const smsMessage = `Your HappyGo order is confirmed. Order ID: ${order._id}. Total Amount: ₹${priceDetails.totalAmount}. Thank you for shopping with HappyGo!`

  await sendSMS({
    phone: user.mobile,
    message: smsMessage,
  })

  res.status(201).json({
    success: true,
    data: populatedOrder,
  })
})

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1, sort } = req.query

  // Build query
  const query = { user: req.user._id }

  // Filter by status
  if (status) {
    query.orderStatus = status
  }

  // Count total documents
  const total = await Order.countDocuments(query)

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
  const orders = await Order.find(query)
    .populate({
      path: "products.product",
      select: "title images",
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(Number.parseInt(limit))

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number.parseInt(page),
    pages: Math.ceil(total / Number.parseInt(limit)),
    data: orders,
  })
})

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate({
      path: "products.product",
      select: "title description images price",
    })
    .populate({
      path: "user",
      select: "name email mobile",
    })
    .populate({
      path: "assignedEmployee",
      select: "name email mobile",
    })

  if (!order) {
    throw new ApiError("Order not found", 404)
  }

  // Check if order belongs to user
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError("Not authorized to access this order", 401)
  }

  res.status(200).json({
    success: true,
    data: order,
  })
})

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, cancellationReason } = req.body

  // Validate status
  if (!status || !["processing", "shipped", "delivered", "cancelled"].includes(status)) {
    throw new ApiError("Invalid status", 400)
  }

  // Get order
  const order = await Order.findById(req.params.id)

  if (!order) {
    throw new ApiError("Order not found", 404)
  }

  // Check if order belongs to user or user is admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError("Not authorized to update this order", 401)
  }

  // If cancelling, require reason
  if (status === "cancelled" && !cancellationReason) {
    throw new ApiError("Please provide a cancellation reason", 400)
  }

  // Update order
  order.orderStatus = status
  if (status === "cancelled") {
    order.cancellationReason = cancellationReason
  }

  await order.save()

  res.status(200).json({
    success: true,
    data: order,
  })
})

