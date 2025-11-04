# 🎯 Complete Booking Flow - Bikes & Hostels

## 📌 **Overview**

There are **TWO cart APIs**:
1. **`GET /api/cart/details`** - Get cart details (bikes + hostels)
2. **`POST /api/bookings/cart`** - Checkout cart (create bookings from cart)

---

## 🔄 **Complete Flow**

```
Step 1: Add items to cart (bikes and/or hostels)
   ↓
Step 2: Get cart details
   ↓
Step 3: Checkout cart (creates bookings + Razorpay order)
   ↓
Step 4: Verify payment
   ↓
Step 5: View bookings (grouped or individual)
```

---

## 📋 **Step-by-Step Flow with CURL**

### **Step 1: Add Bike to Cart**

```bash
curl -X POST http://localhost:8080/api/cart/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bikeId": "65e5a8a1fc13ae1234000103",
    "quantity": 1,
    "kmOption": "unlimited",
    "startDate": "2025-11-05",
    "endDate": "2025-11-05",
    "startTime": "10:00",
    "endTime": "20:00"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Added bike to cart. Added 1 helmet automatically.",
  "data": {
    "_id": "cart_id",
    "bikeItems": [
      {
        "bike": {
          "_id": "65e5a8a1fc13ae1234000103",
          "title": "Honda Activa 6G",
          "images": ["..."]
        },
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 840
      }
    ],
    "hostelItems": [],
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 0,
      "subtotal": 800,
      "gst": 40,
      "total": 840
    }
  }
}
```

---

### **Step 2: Add Hostel to Cart**

```bash
curl -X POST http://localhost:8080/api/cart/hostels \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hostelId": "6905f4cb9fac549caa22a041",
    "roomType": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
    "mealOption": "bedAndBreakfast",
    "quantity": 1,
    "checkIn": "2025-11-05",
    "checkOut": "2025-11-06",
    "isWorkstation": false
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Hostel added to cart successfully",
  "data": {
    "_id": "cart_id",
    "bikeItems": [
      {
        "bike": { /* bike details */ },
        "quantity": 1,
        "totalPrice": 840
      }
    ],
    "hostelItems": [
      {
        "hostel": {
          "_id": "6905f4cb9fac549caa22a041",
          "name": "Mountain View Hostel",
          "location": "Chikkamagaluru"
        },
        "roomType": "Bed in 10 Bed Mixed AC Dormitory Room",
        "mealOption": "bedAndBreakfast",
        "quantity": 1,
        "pricePerNight": 785.33,
        "numberOfNights": 1,
        "totalPrice": 785.33
      }
    ],
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 785.33,
      "subtotal": 1585.33,
      "gst": 79,
      "total": 1664.33
    }
  }
}
```

---

### **Step 3: Get Cart Details**

**This is what you use to show cart summary on frontend**

```bash
curl http://localhost:8080/api/cart/details \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "cart_id",
    "bikeItems": [
      {
        "bike": {
          "_id": "65e5a8a1fc13ae1234000103",
          "title": "Honda Activa 6G",
          "brand": "Honda",
          "model": "6G",
          "images": ["https://..."],
          "availableQuantity": 0,
          "quantity": 10
        },
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 840,
        "addedAt": "2025-11-01T05:15:50.122Z"
      }
    ],
    "hostelItems": [
      {
        "hostel": {
          "_id": "6905f4cb9fac549caa22a041",
          "name": "Mountain View Hostel",
          "location": "Chikkamagaluru",
          "images": ["https://..."],
          "rooms": [/* room details */],
          "ratings": 4.5
        },
        "roomType": "Bed in 10 Bed Mixed AC Dormitory Room",
        "mealOption": "bedAndBreakfast",
        "quantity": 1,
        "pricePerNight": 785.33,
        "numberOfNights": 1,
        "totalPrice": 785.33,
        "addedAt": "2025-11-01T12:56:31.223Z",
        "roomDetails": {
          "type": "Bed in 10 Bed Mixed AC Dormitory Room",
          "capacity": 10,
          "amenities": ["Locker", "AC", "Ensuite Washroom"]
        }
      }
    ],
    "bikeDates": {
      "startDate": "2025-11-05T00:00:00.000Z",
      "endDate": "2025-11-05T00:00:00.000Z",
      "startTime": "10:00",
      "endTime": "20:00"
    },
    "hostelDates": {
      "checkIn": "2025-11-05T00:00:00.000Z",
      "checkOut": "2025-11-06T00:00:00.000Z"
    },
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 785.33,
      "subtotal": 1585.33,
      "gst": 79,
      "gstPercentage": 5,
      "total": 1664.33,
      "bulkDiscount": {
        "amount": 0,
        "percentage": 0
      }
    },
    "helmetDetails": {
      "quantity": 1,
      "charges": 0
    },
    "isEmpty": false,
    "summary": {
      "totalBikes": 1,
      "totalBeds": 1,
      "bikeSubtotal": 800,
      "hostelSubtotal": 785.33,
      "subtotal": 1585.33,
      "gst": 79,
      "total": 1664.33
    }
  }
}
```

---

### **Step 4: Checkout Cart (Create Bookings)**

**This is the NEW combined checkout endpoint**

```bash
curl -X POST http://localhost:8080/api/bookings/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guestDetails": {
      "name": "Nilesh Tiwari",
      "email": "nileshtiwari70545@gmail.com",
      "phone": "9137831800"
    },
    "specialRequests": "",
    "partialPaymentPercentage": 25
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentGroupId": "PG_1762059094681_6863916556ee5c1482baffe8",
    "bookings": [
      {
        "bookingId": "6906e356f6a34660ffc70d32",
        "type": "bike",
        "amount": 840
      },
      {
        "bookingId": "6906e356f6a34660ffc70d37",
        "type": "hostel",
        "amount": 824.33
      }
    ],
    "razorpayOrder": {
      "id": "order_RakJigKsXzO3m4",
      "amount": 41600,  // 416 in paise (25% of 1664.33)
      "currency": "INR"
    },
    "paymentDetails": {
      "totalAmount": 1664.33,
      "partialAmount": 416,
      "remainingAmount": 1248.33,
      "partialPercentage": 25
    }
  },
  "message": "2 booking(s) created successfully. Please complete the payment."
}
```

**What happens**:
1. ✅ Creates 2 separate bookings (1 bike + 1 hostel)
2. ✅ Links them with same `paymentGroupId`
3. ✅ Creates Razorpay order for ₹416 (25% of ₹1664.33)
4. ✅ Clears your cart
5. ✅ Returns Razorpay order details for payment

---

### **Step 5: Verify Payment**

**After user pays via Razorpay, verify the payment**

```bash
curl -X POST http://localhost:8080/api/payments/cart/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentGroupId": "PG_1762059094681_6863916556ee5c1482baffe8",
    "razorpay_order_id": "order_RakJigKsXzO3m4",
    "razorpay_payment_id": "pay_RakKJZNMV1bida",
    "razorpay_signature": "signature_from_razorpay"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Payment verified successfully! 2 booking(s) confirmed.",
  "data": {
    "paymentGroupId": "PG_1762059094681_6863916556ee5c1482baffe8",
    "bookings": [
      {
        "bookingId": "6906e356f6a34660ffc70d32",
        "type": "bike",
        "paymentStatus": "partial",
        "bookingStatus": "confirmed",
        "paidAmount": 210,  // Proportional for bike
        "remainingAmount": 630
      },
      {
        "bookingId": "6906e356f6a34660ffc70d37",
        "type": "hostel",
        "paymentStatus": "partial",
        "bookingStatus": "confirmed",
        "paidAmount": 206,  // Proportional for hostel
        "remainingAmount": 618.33
      }
    ],
    "totalPaid": 416,
    "remainingAmount": 1248.33,
    "allConfirmed": true
  }
}
```

**What happens**:
1. ✅ Verifies Razorpay payment signature
2. ✅ Splits ₹416 proportionally:
   - Bike: ₹210 (50.5%)
   - Hostel: ₹206 (49.5%)
3. ✅ Updates both bookings to `confirmed` status
4. ✅ Sends combined confirmation email

---

### **Step 6: View Bookings (Grouped)**

```bash
curl http://localhost:8080/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (Grouped by default):
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "isCombined": true,
      "bookingType": "combined",
      "paymentGroupId": "PG_1762059094681_6863916556ee5c1482baffe8",
      "bookings": [
        {
          "_id": "6906e356f6a34660ffc70d32",
          "bookingType": "bike",
          "priceDetails": {
            "totalAmount": 840
          },
          "paymentDetails": {
            "paidAmount": 210,
            "remainingAmount": 630
          },
          "bikeItems": [/* bike details */]
        },
        {
          "_id": "6906e356f6a34660ffc70d37",
          "bookingType": "hostel",
          "priceDetails": {
            "totalAmount": 824.33
          },
          "paymentDetails": {
            "paidAmount": 206,
            "remainingAmount": 618.33
          },
          "hostel": {/* hostel details */}
        }
      ],
      "combinedDetails": {
        "totalAmount": 1664.33,
        "paidAmount": 416,
        "remainingAmount": 1248.33,
        "bookingCount": 2,
        "types": ["bike", "hostel"]
      },
      "paymentStatus": "partial",
      "bookingStatus": "confirmed",
      "createdAt": "2025-11-02T04:51:34.683Z"
    }
  ]
}
```

---

### **Step 7: View Single Booking Details**

```bash
curl http://localhost:8080/api/bookings/6906e356f6a34660ffc70d37 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (Clean, with combined info):
```json
{
  "success": true,
  "data": {
    "id": "6906e356f6a34660ffc70d37",
    "bookingType": "hostel",
    "status": "confirmed",
    "paymentStatus": "partial",
    "dates": {
      "start": "2025-11-05T00:00:00.000Z",
      "end": "2025-11-06T00:00:00.000Z",
      "bookedOn": "2025-11-02T04:51:34.764Z"
    },
    "payment": {
      "total": 1664.33,  // Combined total
      "paid": 416,       // Combined paid
      "remaining": 1248.33,  // Combined remaining
      "percentage": 25,
      "method": "online",
      "breakdown": {
        "thisBooking": {  // THIS hostel booking
          "total": 824.33,
          "paid": 206,
          "remaining": 618.33
        },
        "otherBookings": [  // OTHER bookings in group
          {
            "id": "6906e356f6a34660ffc70d32",
            "type": "bike",
            "total": 840,
            "paid": 210
          }
        ]
      }
    },
    "combined": {
      "isCombined": true,
      "paymentGroupId": "PG_1762059094681_6863916556ee5c1482baffe8",
      "totalBookings": 2,
      "otherBookings": [
        {
          "id": "6906e356f6a34660ffc70d32",
          "type": "bike",
          "amount": 840
        }
      ]
    },
    "hostel": {
      "id": "6905f4cb9fac549caa22a041",
      "name": "Mountain View Hostel",
      "location": "Chikkamagaluru",
      "image": "https://...",
      "rating": 4.5,
      "roomType": "Bed in 10 Bed Mixed AC Dormitory Room",
      "mealOption": "bedAndBreakfast",
      "beds": 1,
      "nights": 1
    },
    "guest": {
      "name": "Nilesh Tiwari",
      "email": "nileshtiwari70545@gmail.com",
      "phone": "9137831800"
    },
    "actions": {
      "canPay": true,
      "canCancel": true,
      "canExtend": false
    }
  }
}
```

---

### **Step 8: Pay Remaining Amount**

```bash
# Create remaining payment order
curl -X POST http://localhost:8080/api/payments/booking/6906e356f6a34660ffc70d37 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentType": "remaining"}'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "order_NewOrderId",
    "amount": 124833,  // 1248.33 in paise (CORRECT!)
    "currency": "INR",
    "bookingId": "6906e356f6a34660ffc70d37",
    "paymentType": "remaining",
    "paymentAmount": 1248.33
  }
}
```

```bash
# Verify remaining payment
curl -X POST http://localhost:8080/api/payments/booking/6906e356f6a34660ffc70d37/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_NewOrderId",
    "razorpay_payment_id": "pay_NewPaymentId",
    "razorpay_signature": "signature_from_razorpay"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Remaining payment verified successfully",
  "data": {
    "paymentDetails": {
      "paymentType": "remaining",
      "paidAmount": 618.33,  // Proportional for THIS hostel
      "totalPaid": 824.33,   // Total paid for hostel
      "remainingAmount": 0,
      "paymentStatus": "completed"
    }
  }
}
```

**What happens**:
1. ✅ Charges ₹1,248.33 (combined remaining)
2. ✅ Splits proportionally:
   - Hostel: ₹618.33
   - Bike: ₹630
3. ✅ Both bookings marked as `completed`

---

## 📌 **Summary of APIs**

### **Cart APIs**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/cart/items` | Add bike to cart |
| `POST` | `/api/cart/hostels` | Add hostel to cart |
| `GET` | `/api/cart/details` | **Get complete cart (bikes + hostels)** |
| `PUT` | `/api/cart/helmets` | Update helmet quantity |
| `DELETE` | `/api/cart/items/:itemId` | Remove bike from cart |
| `DELETE` | `/api/cart/hostels/:itemId` | Remove hostel from cart |
| `DELETE` | `/api/cart` | Clear entire cart |

### **Booking APIs**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/bookings/cart` | **Checkout cart (create bookings)** |
| `GET` | `/api/bookings` | Get all bookings (grouped) |
| `GET` | `/api/bookings/:id` | Get single booking details |
| `GET` | `/api/bookings/group/:paymentGroupId` | Get all bookings in payment group |

### **Payment APIs**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/payments/cart/verify` | Verify combined cart payment |
| `POST` | `/api/payments/booking/:id` | Create remaining payment order |
| `POST` | `/api/payments/booking/:id/verify` | Verify remaining payment |

---

## 🎯 **Final Flow Diagram**

```
1. Add Items to Cart
   │
   ├─► POST /api/cart/items (add bike)
   └─► POST /api/cart/hostels (add hostel)
   
2. View Cart
   │
   └─► GET /api/cart/details
   
3. Checkout
   │
   └─► POST /api/bookings/cart
       │
       ├─ Creates 2 bookings (linked by paymentGroupId)
       ├─ Creates Razorpay order for 25%
       └─ Clears cart
   
4. Pay 25%
   │
   └─► POST /api/payments/cart/verify
       │
       ├─ Verifies payment
       ├─ Splits proportionally
       └─ Confirms both bookings
   
5. View Bookings
   │
   ├─► GET /api/bookings (grouped view)
   └─► GET /api/bookings/:id (individual view)
   
6. Pay Remaining 75%
   │
   ├─► POST /api/payments/booking/:id (create order)
   └─► POST /api/payments/booking/:id/verify (verify payment)
       │
       ├─ Charges ₹1248.33 (combined)
       ├─ Splits proportionally
       └─ Completes both bookings
```

---

## ✅ **Key Points**

1. **`GET /api/cart/details`** - Use this to display cart summary
2. **`POST /api/bookings/cart`** - Use this to checkout cart (creates bookings)
3. **Grouped View** - Default booking list shows combined bookings as one
4. **Proportional Split** - All payments split correctly across bookings
5. **Correct Amounts** - No more discrepancies in payment amounts!

---

**Status**: ✅ Complete and tested  
**Frontend**: Update checkout flow to use `/api/bookings/cart`  
**Backend**: All endpoints working correctly

