# Hostel Booking API Documentation

## Overview
This document describes the new hostel booking APIs with partial payment support (25% initial payment + remaining 75% later).

## New Features Added
1. **Hostel Availability Search** - Search hostels by date, location, and stay type
2. **Partial Payment Support** - Pay 25% initially, remaining 75% anytime later
3. **Stay Type Support** - Hostel or Workstation booking types
4. **Enhanced Amenities** - Detailed amenities and guidelines for hostels

---

## API Endpoints

### 1. Get Available Hostels
**GET** `/api/hostels/available`

Search for available hostels based on dates, location, and preferences.

**Query Parameters:**
- `checkIn` (required): Check-in date (YYYY-MM-DD)
- `checkOut` (required): Check-out date (YYYY-MM-DD)  
- `people` (optional): Number of guests (default: 1)
- `location` (optional): Location to search (default: "Chikkamagaluru")
- `stayType` (optional): "hostel" or "workstation" (default: "hostel")

**Example Request:**
```
GET /api/hostels/available?checkIn=2024-01-15&checkOut=2024-01-17&people=2&location=Chikkamagaluru&stayType=hostel
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "hostel_id",
      "name": "Delhi Hostel",
      "description": "Modern hostel in heart of city",
      "location": "Chikkamagaluru",
      "images": ["image1.jpg", "image2.jpg"],
      "amenities": [
        {
          "name": "24/7 Front Desk",
          "icon": "desk",
          "description": "Round the clock assistance"
        }
      ],
      "rooms": [
        {
          "_id": "room_id",
          "type": "Bed in 6 Bed Mixed A/C Dormitory Room with Ensuite Bathroom",
          "description": "Comfortable dormitory bed",
          "capacity": 1,
          "availableRooms": 3,
          "calculatedPricing": {
            "bedOnly": {
              "pricePerNight": 901.8,
              "totalPrice": 1803.6,
              "savings": 880.5
            },
            "bedAndBreakfast": {
              "pricePerNight": 1686,
              "totalPrice": 3372,
              "savings": 0
            }
          },
          "amenities": ["AC", "WiFi", "Bathroom"],
          "isWorkstationFriendly": false
        }
      ],
      "bookingDetails": {
        "checkIn": "2024-01-15T00:00:00.000Z",
        "checkOut": "2024-01-17T00:00:00.000Z",
        "nights": 2,
        "guests": 2,
        "stayType": "hostel"
      },
      "checkInTime": "1:00 PM",
      "checkOutTime": "10:00 AM",
      "policies": {
        "cancellation": ["Free up to 5 days before check-in"],
        "checkIn": ["Valid ID required", "No local IDs accepted"],
        "house": ["No smoking", "Quiet hours 10 PM - 7 AM"]
      }
    }
  ],
  "searchCriteria": {
    "location": "Chikkamagaluru",
    "checkIn": "2024-01-15T00:00:00.000Z",
    "checkOut": "2024-01-17T00:00:00.000Z",
    "people": 2,
    "stayType": "hostel",
    "nights": 2
  }
}
```

### 2. Create Hostel Booking
**POST** `/api/bookings`

Create a new hostel booking with partial payment support.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bookingType": "hostel",
  "hotelId": "hostel_id",
  "roomType": "Bed in 6 Bed Mixed A/C Dormitory Room with Ensuite Bathroom",
  "startDate": "2024-01-15",
  "endDate": "2024-01-17",
  "numberOfPeople": 2,
  "priceDetails": {
    "basePrice": 3372,
    "subtotal": 3372,
    "taxes": 118.87,
    "discount": 264.15,
    "totalAmount": 2760.37
  },
  "hotelDetails": {
    "stayType": "hostel",
    "roomOptions": {
      "bedAndBreakfast": {
        "quantity": 2,
        "pricePerUnit": 1686
      }
    },
    "checkInTime": "14:00"
  },
  "guestDetails": {
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "9876543210"
  },
  "specialRequests": "Ground floor room preferred"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "booking_id",
    "bookingType": "hostel",
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "paymentDetails": {
      "totalAmount": 2760.37,
      "paidAmount": 0,
      "remainingAmount": 2760.37,
      "partialPaymentPercentage": 25,
      "paymentHistory": []
    },
    "paymentOptions": {
      "partialPayment": {
        "amount": 690.09,
        "percentage": 25
      },
      "fullPayment": {
        "amount": 2760.37,
        "percentage": 100
      }
    }
  }
}
```

### 3. Create Payment (Partial/Full)
**POST** `/api/payments/booking/:bookingId`

Create a Razorpay order for payment (supports partial or full payment).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "paymentType": "partial"  // "partial", "remaining", or "full"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_razorpay_id",
    "amount": 69009,  // Amount in paise (690.09 * 100)
    "currency": "INR",
    "receipt": "partial_booking_id_timestamp",
    "bookingId": "booking_id",
    "paymentType": "partial",
    "paymentAmount": 690.09
  }
}
```

### 4. Verify Payment
**POST** `/api/payments/booking/:bookingId/verify`

Verify payment after successful Razorpay payment.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "pay_razorpay_id", 
  "razorpay_signature": "signature_hash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Partial payment verified successfully",
  "data": {
    "booking": {
      "_id": "booking_id",
      "paymentStatus": "partial",
      "bookingStatus": "confirmed"
    },
    "paymentDetails": {
      "paymentType": "partial",
      "paidAmount": 690.09,
      "totalPaid": 690.09,
      "remainingAmount": 2070.28,
      "paymentStatus": "partial"
    }
  }
}
```

### 5. Pay Remaining Amount
To pay the remaining 75%, repeat steps 3-4 with `paymentType: "remaining"`.

---

## Payment Flow

### Scenario 1: Partial Payment (25% now, 75% later)
1. **Create Booking** → Status: `pending`
2. **Pay 25%** → Status: `partial`, Booking: `confirmed` 
3. **Pay Remaining 75%** (anytime later) → Status: `completed`

### Scenario 2: Full Payment (100% now)
1. **Create Booking** → Status: `pending`
2. **Pay 100%** → Status: `completed`, Booking: `confirmed`

---

## Booking Status Flow
- `pending` → Booking created, no payment made
- `confirmed` → Booking confirmed (partial or full payment made)
- `completed` → Full payment completed
- `cancelled` → Booking cancelled

## Payment Status Flow  
- `pending` → No payment made
- `partial` → 25% payment completed
- `completed` → Full payment completed
- `failed` → Payment failed
- `refunded` → Payment refunded

---

## Error Handling

### Common Error Responses:
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Error Codes:
- `400` - Bad Request (Invalid data)
- `401` - Unauthorized (Invalid token)
- `404` - Not Found (Booking/Hostel not found)
- `409` - Conflict (Room not available)
- `500` - Internal Server Error

---

## Key Features

### 1. **Flexible Payment Options**
- Pay 25% to confirm booking
- Pay remaining amount anytime before check-in
- Full payment option available

### 2. **Stay Type Support**
- **Hostel**: Regular hostel stay
- **Workstation**: Business-friendly rooms with work amenities

### 3. **Enhanced Search**
- Location-based filtering
- Date availability checking
- Capacity-based room filtering
- Real-time pricing calculation

### 4. **Rich Hostel Data**
- Detailed amenities with descriptions
- Multiple room types and pricing options
- Policies and guidelines
- Contact information

### 5. **Email Notifications**
- Booking creation confirmation
- Partial payment confirmation  
- Full payment completion
- Remaining payment reminders

---

## Testing with Postman

Import the updated Postman collection to test all endpoints. The collection includes:
- Environment variables for base URL and auth tokens
- Pre-request scripts for authentication
- Test scripts for response validation
- Example requests for all scenarios

### Environment Variables:
- `base_url`: API base URL
- `auth_token`: User authentication token
- `booking_id`: Created booking ID for testing payments


