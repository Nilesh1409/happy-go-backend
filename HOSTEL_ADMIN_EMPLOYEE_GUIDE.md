# 🏨 Hostel Admin & Employee Management Guide

Complete guide for managing hostels and bookings through admin and employee interfaces.

---

## 📋 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Hostel Management](#hostel-management)
3. [Booking Management](#booking-management)
4. [Statistics & Reports](#statistics--reports)
5. [Payment Operations](#payment-operations)
6. [Employee Operations](#employee-operations)

---

## 🔐 Authentication & Authorization

### Roles
- **Admin** (`adminProtect`): Full access to all operations
- **Employee** (`employeeOrAdminProtect`): Access based on assigned modules
- **Employee with Hostel Module** (`employeeProtect`): Can manage bookings assigned to them

### Headers Required
```
Authorization: Bearer <token>
```

---

## 🏨 Hostel Management

### 1. Get All Hostels (Admin)

**Purpose:** View all hostels with filtering, pagination, and search

**Endpoint:** `GET /api/hostels/admin/all`

**Query Parameters:**
- `search` (optional): Text search in hostel names/descriptions
- `limit` (optional, default: 10): Number of items per page
- `page` (optional, default: 1): Page number
- `sort` (optional): Sort fields (e.g., "-createdAt,name")
- `isActive` (optional): Filter by active status (true/false)

**cURL Example:**
```bash
# Get all active hostels
curl -X GET "http://localhost:8080/api/hostels/admin/all?isActive=true&limit=20&page=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Search hostels with pagination
curl -X GET "http://localhost:8080/api/hostels/admin/all?search=chikkamagaluru&limit=10&page=1&sort=-createdAt" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get all hostels including inactive
curl -X GET "http://localhost:8080/api/hostels/admin/all?limit=50" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "pages": 2,
  "data": [
    {
      "_id": "67890abc",
      "name": "Cozy Mountain Hostel",
      "location": "Chikkamagaluru",
      "description": "A beautiful hostel with mountain views",
      "images": [
        "https://s3.amazonaws.com/hostel1.jpg",
        "https://s3.amazonaws.com/hostel2.jpg"
      ],
      "amenities": ["WiFi", "Parking", "Kitchen"],
      "ratings": {
        "average": 4.5,
        "totalReviews": 125
      },
      "rooms": [
        {
          "type": "Dormitory (6-bed)",
          "capacity": 6,
          "totalBeds": 6,
          "availableBeds": 4,
          "amenities": ["AC", "Lockers"],
          "isWorkstationFriendly": true,
          "mealOptions": {
            "bedOnly": {
              "basePrice": 500,
              "discountedPrice": 450
            },
            "bedAndBreakfast": {
              "basePrice": 650,
              "discountedPrice": 600
            },
            "bedBreakfastAndDinner": {
              "basePrice": 850,
              "discountedPrice": 800
            }
          }
        }
      ],
      "supportsWorkstation": true,
      "isActive": true,
      "contactInfo": {
        "phone": "+91-9876543210",
        "email": "hostel@example.com"
      },
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-20T15:30:00.000Z"
    }
  ]
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

---

### 2. Get Single Hostel

**Purpose:** View detailed information of a specific hostel

**Endpoint:** `GET /api/hostels/:id`

**Access:** Public (no authentication required)

**cURL Example:**
```bash
curl -X GET "http://localhost:8080/api/hostels/67890abc"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "67890abc",
    "name": "Cozy Mountain Hostel",
    "location": "Chikkamagaluru",
    "description": "A beautiful hostel with mountain views",
    "images": ["https://s3.amazonaws.com/hostel1.jpg"],
    "amenities": ["WiFi", "Parking", "Kitchen"],
    "rooms": [
      {
        "type": "Dormitory (6-bed)",
        "capacity": 6,
        "totalBeds": 6,
        "availableBeds": 4,
        "amenities": ["AC", "Lockers"],
        "mealOptions": {
          "bedOnly": { "basePrice": 500 },
          "bedAndBreakfast": { "basePrice": 650 }
        }
      }
    ],
    "contactInfo": {
      "phone": "+91-9876543210"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Hostel not found"
}
```

---

### 3. Create New Hostel

**Purpose:** Add a new hostel to the system

**Endpoint:** `POST /api/hostels`

**Access:** Admin or Employee with hostel module access

**Request Body:**
```json
{
  "name": "New Hostel Name",
  "location": "Chikkamagaluru",
  "description": "Detailed description of the hostel",
  "images": [
    "https://s3.amazonaws.com/image1.jpg",
    "https://s3.amazonaws.com/image2.jpg"
  ],
  "amenities": ["WiFi", "Parking", "Kitchen", "Laundry"],
  "rooms": [
    {
      "type": "Dormitory (6-bed)",
      "capacity": 6,
      "totalBeds": 6,
      "amenities": ["AC", "Lockers", "Window"],
      "isWorkstationFriendly": true,
      "workstationAmenities": ["Desk", "Chair", "Good Lighting"],
      "mealOptions": {
        "bedOnly": {
          "basePrice": 500,
          "discountedPrice": 450
        },
        "bedAndBreakfast": {
          "basePrice": 650,
          "discountedPrice": 600
        },
        "bedBreakfastAndDinner": {
          "basePrice": 850,
          "discountedPrice": 800
        }
      }
    },
    {
      "type": "Private Room",
      "capacity": 2,
      "totalBeds": 2,
      "amenities": ["AC", "Attached Bathroom", "TV"],
      "isWorkstationFriendly": true,
      "mealOptions": {
        "bedOnly": {
          "basePrice": 1200
        },
        "bedAndBreakfast": {
          "basePrice": 1400
        },
        "bedBreakfastAndDinner": {
          "basePrice": 1700
        }
      }
    }
  ],
  "supportsWorkstation": true,
  "isActive": true,
  "contactInfo": {
    "phone": "+91-9876543210",
    "email": "hostel@example.com",
    "address": "123 Main Street, Chikkamagaluru"
  }
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8080/api/hostels" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Mountain Hostel",
    "location": "Chikkamagaluru",
    "description": "Beautiful hostel with amazing views",
    "images": ["https://example.com/image1.jpg"],
    "amenities": ["WiFi", "Parking"],
    "rooms": [
      {
        "type": "Dormitory (6-bed)",
        "capacity": 6,
        "totalBeds": 6,
        "amenities": ["AC"],
        "isWorkstationFriendly": true,
        "mealOptions": {
          "bedOnly": { "basePrice": 500 },
          "bedAndBreakfast": { "basePrice": 650 }
        }
      }
    ],
    "contactInfo": {
      "phone": "+91-9876543210"
    }
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Hostel created successfully",
  "data": {
    "_id": "67890xyz",
    "name": "New Mountain Hostel",
    "location": "Chikkamagaluru",
    "rooms": [
      {
        "type": "Dormitory (6-bed)",
        "totalBeds": 6,
        "availableBeds": 6
      }
    ],
    "isActive": true,
    "createdAt": "2025-01-25T10:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error: name is required"
}
```

---

### 4. Update Hostel

**Purpose:** Update existing hostel information

**Endpoint:** `PUT /api/hostels/:id`

**Access:** Admin or Employee with hostel module access

**Request Body:** (All fields optional, send only what needs to be updated)
```json
{
  "name": "Updated Hostel Name",
  "description": "Updated description",
  "images": ["https://new-image.jpg"],
  "amenities": ["WiFi", "Parking", "Kitchen", "Game Room"],
  "rooms": [
    {
      "type": "Dormitory (6-bed)",
      "capacity": 6,
      "totalBeds": 8,
      "amenities": ["AC", "Lockers"],
      "mealOptions": {
        "bedOnly": {
          "basePrice": 550,
          "discountedPrice": 500
        }
      }
    }
  ],
  "isActive": true
}
```

**cURL Example:**
```bash
# Update hostel pricing
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Dormitory (6-bed)",
        "capacity": 6,
        "totalBeds": 6,
        "mealOptions": {
          "bedOnly": {
            "basePrice": 550,
            "discountedPrice": 500
          }
        }
      }
    ]
  }'

# Update hostel status
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abc",
    "name": "Updated Hostel Name",
    "isActive": true,
    "updatedAt": "2025-01-25T12:30:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Hostel not found"
}
```

---

### 5. Delete Hostel (Soft Delete)

**Purpose:** Deactivate a hostel (sets `isActive: false`)

**Endpoint:** `DELETE /api/hostels/:id`

**Access:** Admin or Employee with hostel module access

**Note:** This is a soft delete - the hostel is not removed from the database, just marked as inactive

**cURL Example:**
```bash
curl -X DELETE "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hostel deactivated successfully",
  "data": {}
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Hostel not found"
}
```

---

## 📅 Booking Management

### 6. Get All Hostel Bookings

**Purpose:** View all hostel bookings with filters and statistics

**Endpoint:** `GET /api/hostels/admin/bookings`

**Access:** Admin or Employee with hostel module access

**Query Parameters:**
- `status` (optional): Filter by booking status (pending/confirmed/cancelled/completed)
- `paymentStatus` (optional): Filter by payment status (pending/partial/completed)
- `hostelId` (optional): Filter by specific hostel ID
- `startDate` (optional): Filter bookings from this date (YYYY-MM-DD)
- `endDate` (optional): Filter bookings until this date (YYYY-MM-DD)
- `limit` (optional, default: 10): Items per page
- `page` (optional, default: 1): Page number
- `sort` (optional): Sort fields (e.g., "-createdAt")

**cURL Examples:**
```bash
# Get all bookings with default pagination
curl -X GET "http://localhost:8080/api/hostels/admin/bookings" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get confirmed bookings with partial payment
curl -X GET "http://localhost:8080/api/hostels/admin/bookings?status=confirmed&paymentStatus=partial" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get bookings for specific hostel
curl -X GET "http://localhost:8080/api/hostels/admin/bookings?hostelId=67890abc&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get bookings in date range
curl -X GET "http://localhost:8080/api/hostels/admin/bookings?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get pending bookings sorted by creation date
curl -X GET "http://localhost:8080/api/hostels/admin/bookings?status=pending&sort=-createdAt" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "stats": {
    "total": 45,
    "bookingsByStatus": {
      "pending": 5,
      "confirmed": 30,
      "cancelled": 5,
      "completed": 5
    },
    "bookingsByPaymentStatus": {
      "pending": {
        "count": 5,
        "totalAmount": 15000,
        "paidAmount": 0,
        "remainingAmount": 15000
      },
      "partial": {
        "count": 20,
        "totalAmount": 80000,
        "paidAmount": 20000,
        "remainingAmount": 60000
      },
      "completed": {
        "count": 20,
        "totalAmount": 100000,
        "paidAmount": 100000,
        "remainingAmount": 0
      }
    },
    "totalRevenue": 195000,
    "paidRevenue": 120000,
    "pendingRevenue": 75000
  },
  "data": [
    {
      "_id": "690abc123",
      "bookingType": "hostel",
      "bookingStatus": "confirmed",
      "paymentStatus": "partial",
      "hostel": {
        "_id": "67890abc",
        "name": "Cozy Mountain Hostel",
        "location": "Chikkamagaluru",
        "images": ["https://s3.amazonaws.com/hostel1.jpg"]
      },
      "user": {
        "_id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "mobile": "+91-9876543210"
      },
      "assignedEmployee": {
        "_id": "emp123",
        "name": "Employee Name",
        "email": "emp@example.com",
        "mobile": "+91-9876543210",
        "department": "Operations"
      },
      "roomType": "Dormitory (6-bed)",
      "mealOption": "bedAndBreakfast",
      "numberOfBeds": 2,
      "numberOfNights": 3,
      "startDate": "2025-02-01T00:00:00.000Z",
      "endDate": "2025-02-04T00:00:00.000Z",
      "checkIn": "2025-02-01T14:00:00.000Z",
      "checkOut": "2025-02-04T11:00:00.000Z",
      "priceDetails": {
        "basePrice": 3900,
        "gst": 702,
        "discount": 0,
        "totalAmount": 4602
      },
      "paymentDetails": {
        "totalAmount": 4602,
        "paidAmount": 1150,
        "remainingAmount": 3452,
        "partialPaymentPercentage": 25
      },
      "computed": {
        "nights": 3,
        "canCancel": true,
        "canModify": true,
        "isUpcoming": true,
        "isActive": false,
        "isPast": false,
        "daysUntilCheckIn": 7
      },
      "paymentSummary": {
        "status": "partial",
        "totalAmount": 4602,
        "paidAmount": 1150,
        "remainingAmount": 3452,
        "paymentPercentage": 25,
        "isPartialPayment": true,
        "isFullyPaid": false
      },
      "specialRequests": "Late check-in required",
      "createdAt": "2025-01-25T10:00:00.000Z",
      "updatedAt": "2025-01-25T10:30:00.000Z"
    }
  ]
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

---

### 7. Get Single Hostel Booking Details

**Purpose:** View detailed information of a specific hostel booking

**Endpoint:** `GET /api/hostels/admin/bookings/:id`

**Access:** Admin or Employee with hostel module access

**cURL Example:**
```bash
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/690abc123" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "690abc123",
    "bookingType": "hostel",
    "bookingStatus": "confirmed",
    "paymentStatus": "partial",
    "hostel": {
      "_id": "67890abc",
      "name": "Cozy Mountain Hostel",
      "location": "Chikkamagaluru",
      "images": ["https://s3.amazonaws.com/hostel1.jpg"],
      "amenities": ["WiFi", "Parking", "Kitchen"],
      "contactInfo": {
        "phone": "+91-9876543210",
        "email": "hostel@example.com"
      }
    },
    "user": {
      "_id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "+91-9876543210",
      "createdAt": "2024-12-01T00:00:00.000Z"
    },
    "assignedEmployee": {
      "_id": "emp123",
      "name": "Employee Name",
      "email": "emp@example.com",
      "mobile": "+91-9876543210",
      "department": "Operations",
      "role": "supervisor"
    },
    "roomType": "Dormitory (6-bed)",
    "mealOption": "bedAndBreakfast",
    "numberOfBeds": 2,
    "numberOfNights": 3,
    "startDate": "2025-02-01T00:00:00.000Z",
    "endDate": "2025-02-04T00:00:00.000Z",
    "checkIn": "2025-02-01T14:00:00.000Z",
    "checkOut": "2025-02-04T11:00:00.000Z",
    "priceDetails": {
      "basePrice": 3900,
      "gst": 702,
      "discount": 0,
      "totalAmount": 4602
    },
    "paymentDetails": {
      "totalAmount": 4602,
      "paidAmount": 1150,
      "remainingAmount": 3452,
      "partialPaymentPercentage": 25,
      "paymentHistory": [
        {
          "paymentId": "pay_123abc",
          "razorpayOrderId": "order_123xyz",
          "razorpayPaymentId": "pay_123abc",
          "amount": 1150,
          "paymentType": "partial",
          "status": "completed",
          "paidAt": "2025-01-25T10:30:00.000Z",
          "createdAt": "2025-01-25T10:25:00.000Z"
        }
      ]
    },
    "hotelDetails": {
      "roomOptions": {
        "bedAndBreakfast": {
          "quantity": 2
        }
      }
    },
    "roomDetails": {
      "type": "Dormitory (6-bed)",
      "capacity": 6,
      "totalBeds": 6,
      "availableBeds": 4,
      "amenities": ["AC", "Lockers"],
      "isWorkstationFriendly": true,
      "workstationAmenities": ["Desk", "Chair"]
    },
    "computed": {
      "nights": 3,
      "canCancel": true,
      "canModify": true,
      "isUpcoming": true,
      "isActive": false,
      "isPast": false,
      "daysUntilCheckIn": 7,
      "daysUntilCheckOut": 10
    },
    "paymentSummary": {
      "status": "partial",
      "totalAmount": 4602,
      "paidAmount": 1150,
      "remainingAmount": 3452,
      "paymentPercentage": 25,
      "isPartialPayment": true,
      "isFullyPaid": false,
      "paymentHistory": [...]
    },
    "specialRequests": "Late check-in required",
    "createdAt": "2025-01-25T10:00:00.000Z",
    "updatedAt": "2025-01-25T10:30:00.000Z"
  }
}
```

**Error Responses:**

404 - Booking not found:
```json
{
  "success": false,
  "error": "Booking not found"
}
```

400 - Not a hostel booking:
```json
{
  "success": false,
  "error": "This is not a hostel booking"
}
```

---

## 📊 Statistics & Reports

### 8. Get Hostel Booking Statistics

**Purpose:** Get comprehensive statistics and analytics for hostel bookings

**Endpoint:** `GET /api/hostels/admin/bookings/stats`

**Access:** Admin or Employee with hostel module access

**Query Parameters:**
- `hostelId` (optional): Get stats for a specific hostel
- `startDate` (optional): Stats from this date (YYYY-MM-DD)
- `endDate` (optional): Stats until this date (YYYY-MM-DD)

**cURL Examples:**
```bash
# Get overall hostel booking statistics
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get stats for specific hostel
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/stats?hostelId=67890abc" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get stats for date range
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get stats for specific hostel in date range
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/stats?hostelId=67890abc&startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalBookings": 125,
    "statusBreakdown": {
      "pending": 10,
      "confirmed": 85,
      "cancelled": 15,
      "completed": 15
    },
    "paymentStatusBreakdown": [
      {
        "status": "pending",
        "count": 10,
        "totalAmount": 30000,
        "paidAmount": 0,
        "remainingAmount": 30000
      },
      {
        "status": "partial",
        "count": 50,
        "totalAmount": 200000,
        "paidAmount": 50000,
        "remainingAmount": 150000
      },
      {
        "status": "completed",
        "count": 65,
        "totalAmount": 320000,
        "paidAmount": 320000,
        "remainingAmount": 0
      }
    ],
    "revenueStats": {
      "totalRevenue": 550000,
      "paidRevenue": 370000,
      "pendingRevenue": 180000,
      "averageBookingValue": 4400
    },
    "roomTypeBreakdown": [
      {
        "_id": "Dormitory (6-bed)",
        "count": 75,
        "totalBeds": 150,
        "revenue": 225000
      },
      {
        "_id": "Private Room",
        "count": 35,
        "totalBeds": 70,
        "revenue": 105000
      },
      {
        "_id": "Dormitory (4-bed)",
        "count": 15,
        "totalBeds": 30,
        "revenue": 40000
      }
    ],
    "mealOptionBreakdown": [
      {
        "_id": "bedAndBreakfast",
        "count": 65,
        "revenue": 195000
      },
      {
        "_id": "bedOnly",
        "count": 40,
        "revenue": 120000
      },
      {
        "_id": "bedBreakfastAndDinner",
        "count": 20,
        "revenue": 55000
      }
    ],
    "topHostels": [
      {
        "_id": "67890abc",
        "bookingCount": 45,
        "totalBeds": 90,
        "revenue": 135000,
        "name": "Cozy Mountain Hostel",
        "location": "Chikkamagaluru",
        "image": "https://s3.amazonaws.com/hostel1.jpg"
      },
      {
        "_id": "67890def",
        "bookingCount": 38,
        "totalBeds": 76,
        "revenue": 114000,
        "name": "Valley View Hostel",
        "location": "Chikkamagaluru",
        "image": "https://s3.amazonaws.com/hostel2.jpg"
      }
    ],
    "occupancyData": {
      "totalBedsBooked": 250,
      "totalNights": 750
    },
    "monthlyTrend": [
      {
        "_id": {
          "year": 2025,
          "month": 1
        },
        "bookingCount": 35,
        "revenue": 105000,
        "beds": 70
      },
      {
        "_id": {
          "year": 2024,
          "month": 12
        },
        "bookingCount": 28,
        "revenue": 84000,
        "beds": 56
      },
      {
        "_id": {
          "year": 2024,
          "month": 11
        },
        "bookingCount": 22,
        "revenue": 66000,
        "beds": 44
      }
    ]
  }
}
```

**Use Cases:**
- Dashboard overview
- Revenue analysis
- Occupancy tracking
- Popular room types analysis
- Meal preference insights
- Monthly trend reports
- Performance comparison between hostels

---

## 💰 Payment Operations

### 9. Mark Payment as Completed (Manual/Offline Payment)

**Purpose:** Manually mark remaining payment as completed (for cash/offline payments)

**Endpoint:** `PUT /api/admin/bookings/:id/complete-payment`

**Access:** Admin only

**Request Body:**
```json
{
  "paymentMethod": "cash",
  "paymentReference": "CASH-2025-001",
  "notes": "Received cash payment at front desk"
}
```

**cURL Example:**
```bash
# Mark cash payment as completed
curl -X PUT "http://localhost:8080/api/admin/bookings/690abc123/complete-payment" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cash",
    "paymentReference": "CASH-2025-001",
    "notes": "Received cash payment at front desk"
  }'

# Mark bank transfer as completed
curl -X PUT "http://localhost:8080/api/admin/bookings/690abc123/complete-payment" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "bank_transfer",
    "paymentReference": "TXN-987654321",
    "notes": "Bank transfer confirmed via NEFT"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment marked as completed successfully",
  "data": {
    "_id": "690abc123",
    "bookingStatus": "confirmed",
    "paymentStatus": "completed",
    "paymentDetails": {
      "totalAmount": 4602,
      "paidAmount": 4602,
      "remainingAmount": 0,
      "paymentHistory": [
        {
          "paymentId": "pay_123abc",
          "amount": 1150,
          "paymentType": "partial",
          "status": "completed",
          "paidAt": "2025-01-25T10:30:00.000Z"
        },
        {
          "paymentId": "MANUAL_1737890000000",
          "amount": 3452,
          "paymentType": "remaining",
          "paymentMethod": "cash",
          "paymentReference": "CASH-2025-001",
          "notes": "Received cash payment at front desk",
          "status": "completed",
          "paidAt": "2025-01-26T15:00:00.000Z"
        }
      ]
    }
  }
}
```

**Error Responses:**

404 - Booking not found:
```json
{
  "success": false,
  "error": "Booking not found"
}
```

400 - Payment already completed:
```json
{
  "success": false,
  "error": "Payment already completed for this booking"
}
```

400 - No remaining amount:
```json
{
  "success": false,
  "error": "No remaining amount to pay"
}
```

**Payment Methods Accepted:**
- `cash` - Cash payment
- `bank_transfer` - Bank transfer/NEFT/IMPS
- `upi` - UPI payment
- `cheque` - Cheque payment
- `card` - Card payment at counter

---

### 10. Assign Booking to Employee

**Purpose:** Assign a hostel booking to a specific employee for management

**Endpoint:** `PUT /api/admin/bookings/:id/assign`

**Access:** Admin only

**Request Body:**
```json
{
  "employeeId": "emp123"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/admin/bookings/690abc123/assign" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp123"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "690abc123",
    "bookingType": "hostel",
    "assignedEmployee": "emp123",
    "updatedAt": "2025-01-26T10:00:00.000Z"
  }
}
```

**Error Responses:**

400 - Missing employee ID:
```json
{
  "success": false,
  "error": "Please provide employee ID"
}
```

404 - Booking not found:
```json
{
  "success": false,
  "error": "Booking not found"
}
```

404 - Employee not found:
```json
{
  "success": false,
  "error": "Employee not found"
}
```

400 - Employee doesn't have access:
```json
{
  "success": false,
  "error": "Employee does not have access to hostel module"
}
```

---

## 👥 Employee Operations

### 11. Get Employee Bookings

**Purpose:** Get all bookings assigned to or accessible by an employee

**Endpoint:** `GET /api/employees/bookings`

**Access:** Employee only

**Query Parameters:**
- `status` (optional): Filter by status (pending/confirmed/cancelled/completed)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `type` (optional): Filter by type (hostel/bike/hotel)
- `limit` (optional, default: 10): Items per page
- `page` (optional, default: 1): Page number
- `sort` (optional): Sort fields

**cURL Examples:**
```bash
# Get all hostel bookings for employee
curl -X GET "http://localhost:8080/api/employees/bookings?type=hostel" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN"

# Get confirmed hostel bookings
curl -X GET "http://localhost:8080/api/employees/bookings?type=hostel&status=confirmed" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN"

# Get upcoming bookings
curl -X GET "http://localhost:8080/api/employees/bookings?type=hostel&startDate=2025-01-26" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 15,
  "total": 45,
  "page": 1,
  "pages": 3,
  "data": [
    {
      "_id": "690abc123",
      "bookingType": "hostel",
      "bookingStatus": "confirmed",
      "paymentStatus": "partial",
      "hostel": {
        "_id": "67890abc",
        "name": "Cozy Mountain Hostel",
        "location": "Chikkamagaluru"
      },
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "mobile": "+91-9876543210"
      },
      "roomType": "Dormitory (6-bed)",
      "numberOfBeds": 2,
      "startDate": "2025-02-01T00:00:00.000Z",
      "endDate": "2025-02-04T00:00:00.000Z",
      "paymentDetails": {
        "totalAmount": 4602,
        "paidAmount": 1150,
        "remainingAmount": 3452
      }
    }
  ]
}
```

---

### 12. Update Booking Status (Employee)

**Purpose:** Update booking status (confirm, cancel, complete)

**Endpoint:** `PUT /api/employees/bookings/:id/status`

**Access:** Employee only (must be assigned to the booking or have access to the hostel module)

**Request Body:**
```json
{
  "status": "confirmed",
  "cancellationReason": "Customer request"
}
```

**Status Options:**
- `confirmed` - Confirm the booking
- `cancelled` - Cancel the booking
- `completed` - Mark booking as completed

**cURL Examples:**
```bash
# Confirm a booking
curl -X PUT "http://localhost:8080/api/employees/bookings/690abc123/status" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'

# Cancel a booking with reason
curl -X PUT "http://localhost:8080/api/employees/bookings/690abc123/status" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "cancellationReason": "Customer requested cancellation"
  }'

# Complete a booking
curl -X PUT "http://localhost:8080/api/employees/bookings/690abc123/status" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "690abc123",
    "bookingStatus": "confirmed",
    "assignedEmployee": "emp123",
    "updatedAt": "2025-01-26T10:30:00.000Z"
  }
}
```

**Error Responses:**

400 - Invalid status:
```json
{
  "success": false,
  "error": "Invalid status"
}
```

404 - Booking not found:
```json
{
  "success": false,
  "error": "Booking not found"
}
```

---

### 13. Mark Payment as Completed (Employee)

**Purpose:** Employee can also mark remaining payments as completed

**Endpoint:** `PUT /api/employees/bookings/:id/complete-payment`

**Access:** Employee only (must be assigned to the booking)

**Request Body:**
```json
{
  "paymentMethod": "cash",
  "paymentReference": "CASH-2025-001",
  "notes": "Received cash at front desk"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/employees/bookings/690abc123/complete-payment" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cash",
    "paymentReference": "CASH-2025-001",
    "notes": "Received cash payment"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment marked as completed successfully",
  "data": {
    "_id": "690abc123",
    "paymentStatus": "completed",
    "paymentDetails": {
      "totalAmount": 4602,
      "paidAmount": 4602,
      "remainingAmount": 0
    }
  }
}
```

---

## 📱 Complete Admin Workflow Examples

### Scenario 1: New Hostel Setup

```bash
# Step 1: Create hostel
curl -X POST "http://localhost:8080/api/hostels" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mountain View Hostel",
    "location": "Chikkamagaluru",
    "rooms": [
      {
        "type": "Dormitory (6-bed)",
        "capacity": 6,
        "totalBeds": 12,
        "mealOptions": {
          "bedOnly": { "basePrice": 500 },
          "bedAndBreakfast": { "basePrice": 650 }
        }
      }
    ],
    "contactInfo": { "phone": "+91-9876543210" }
  }'

# Step 2: Verify creation
curl -X GET "http://localhost:8080/api/hostels/admin/all?isActive=true" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Scenario 2: Managing a Booking

```bash
# Step 1: View booking details
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/690abc123" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Step 2: Assign to employee
curl -X PUT "http://localhost:8080/api/admin/bookings/690abc123/assign" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "emp123"}'

# Step 3: Mark payment completed (if cash received)
curl -X PUT "http://localhost:8080/api/admin/bookings/690abc123/complete-payment" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cash",
    "paymentReference": "CASH-001"
  }'
```

### Scenario 3: Monthly Report Generation

```bash
# Step 1: Get overall statistics
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/stats?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Step 2: Get all bookings for the month
curl -X GET "http://localhost:8080/api/hostels/admin/bookings?startDate=2025-01-01&endDate=2025-01-31&limit=100" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Step 3: Get hostel-specific stats
curl -X GET "http://localhost:8080/api/hostels/admin/bookings/stats?hostelId=67890abc&startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Scenario 4: Hostel Price Update

```bash
# Step 1: Get current hostel details
curl -X GET "http://localhost:8080/api/hostels/67890abc"

# Step 2: Update pricing
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Dormitory (6-bed)",
        "capacity": 6,
        "totalBeds": 6,
        "mealOptions": {
          "bedOnly": {
            "basePrice": 550,
            "discountedPrice": 500
          },
          "bedAndBreakfast": {
            "basePrice": 700,
            "discountedPrice": 650
          }
        }
      }
    ]
  }'

# Step 3: Verify update
curl -X GET "http://localhost:8080/api/hostels/67890abc"
```

---

## 📱 Complete Employee Workflow Examples

### Scenario 1: Daily Check-ins Management

```bash
# Step 1: Get today's check-ins
TODAY=$(date +%Y-%m-%d)
curl -X GET "http://localhost:8080/api/employees/bookings?type=hostel&startDate=$TODAY&endDate=$TODAY&status=confirmed" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN"

# Step 2: View specific booking details
curl -X GET "http://localhost:8080/api/bookings/690abc123" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN"

# Step 3: Collect remaining payment (if any)
curl -X PUT "http://localhost:8080/api/employees/bookings/690abc123/complete-payment" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cash",
    "paymentReference": "CASH-001",
    "notes": "Collected at check-in"
  }'
```

### Scenario 2: Handling Cancellation

```bash
# Step 1: Get booking details
curl -X GET "http://localhost:8080/api/bookings/690abc123" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN"

# Step 2: Cancel the booking
curl -X PUT "http://localhost:8080/api/employees/bookings/690abc123/status" \
  -H "Authorization: Bearer EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "cancellationReason": "Customer health emergency"
  }'
```

---

## 🔑 Key Points

### Access Control
- **Admin**: Full access to all operations
- **Employee with Hostel Module**: Can view and manage hostels and bookings
- **Employee without Hostel Module**: No access to hostel operations

### Important Notes
1. **Soft Delete**: Deleting a hostel sets `isActive: false`, doesn't remove from database
2. **Payment Status**: 
   - `pending` - No payment made
   - `partial` - Partial payment (usually 25%)
   - `completed` - Full payment received
3. **Booking Status**:
   - `pending` - Created but not confirmed
   - `confirmed` - Confirmed and active
   - `cancelled` - Cancelled by user or admin
   - `completed` - Check-out completed
4. **Date Formats**: Use ISO 8601 format (YYYY-MM-DD or full ISO string)
5. **Pagination**: Always use `limit` and `page` for large datasets
6. **Combined Bookings**: If a booking is part of a combined cart, it will have a `paymentGroupId`

### Common Filters
- **Status Filters**: `pending`, `confirmed`, `cancelled`, `completed`
- **Payment Filters**: `pending`, `partial`, `completed`
- **Sort Options**: `-createdAt` (newest first), `createdAt` (oldest first), `name`, etc.

---

## 🚨 Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized / Not authenticated
- `403` - Forbidden / No access
- `404` - Not found
- `500` - Server error

---

## 📞 Support

For technical issues or questions:
- Contact: Backend Development Team
- Email: backend@happygo.com

---

**Last Updated:** January 26, 2025
**Version:** 2.0
**Backend Base URL:** `http://localhost:8080` (Development)

