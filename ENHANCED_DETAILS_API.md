# Enhanced Details API Documentation

## Overview
The enhanced booking and order detail endpoints now provide comprehensive information including important product details, computed fields, and frontend-ready data for bikes, hotels, and products.

---

## 1. Get Enhanced Booking Details

**Endpoint:** `GET /api/bookings/:id`
**Access:** Private
**Description:** Get comprehensive booking details with enhanced bike/hotel information

### CURL Example:
```bash
curl -X GET http://localhost:5000/api/bookings/68933f8512e787cd85646312 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Success Response (200) - Multiple Bike Booking:
```json
{
  "success": true,
  "data": {
    "_id": "68933f8512e787cd85646312",
    "user": {
      "_id": "67f1144bcdc79a816b7b4865",
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "9876543210",
      "profilePicture": "https://example.com/profile.jpg"
    },
    "bookingType": "bike",
    "bikeItems": [
      {
        "bike": "65e5a8a1fc13ae1234000101",
        "quantity": 2,
        "kmOption": "limited",
        "pricePerUnit": 400,
        "totalPrice": 800,
        "kmLimit": 60,
        "additionalKmPrice": 5,
        "bikeUnits": [
          {
            "unitNumber": 1,
            "status": "pending",
            "_id": "6891ec86ed75071437053a27"
          },
          {
            "unitNumber": 2,
            "status": "pending",
            "_id": "6891ec86ed75071437053a28"
          }
        ]
      }
    ],
    "bikeItemsWithDetails": [
      {
        "bike": {
          "_id": "65e5a8a1fc13ae1234000101",
          "title": "Royal Enfield Classic 350",
          "brand": "Royal Enfield",
          "model": "Classic 350",
          "year": 2023,
          "images": [
            "https://example.com/bike1.jpg",
            "https://example.com/bike2.jpg"
          ],
          "registrationNumber": "MH01AB1234",
          "location": "Mumbai",
          "features": ["Electric Start", "LED Headlight", "Digital Console"],
          "requiredDocuments": ["ID Proof", "Driving License"],
          "termsAndConditions": ["Must return with same fuel level"],
          "ratings": 4.5,
          "numReviews": 150,
          "currentAvailability": 8,
          "isHighDemand": false,
          "hasSpecialPricing": true,
          "pricePerDay": {
            "weekday": {
              "limitedKm": {
                "price": 400,
                "kmLimit": 60,
                "isActive": true
              },
              "unlimited": {
                "price": 600,
                "isActive": true
              }
            },
            "weekend": {
              "limitedKm": {
                "price": 600,
                "kmLimit": 60,
                "isActive": true
              },
              "unlimited": {
                "price": 800,
                "isActive": true
              }
            }
          },
          "specialPricing": [
            {
              "name": "New Year Special",
              "startDate": "2025-12-31T00:00:00.000Z",
              "endDate": "2026-01-02T00:00:00.000Z",
              "pricing": {
                "limitedKm": {
                  "price": 800,
                  "kmLimit": 60,
                  "isActive": true
                },
                "unlimited": {
                  "price": 1200,
                  "isActive": true
                }
              },
              "isActive": true
            }
          ]
        },
        "quantity": 2,
        "kmOption": "limited",
        "pricePerUnit": 400,
        "totalPrice": 800
      }
    ],
    "startDate": "2025-08-15T00:00:00.000Z",
    "endDate": "2025-08-16T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "20:00",
    "totalBikes": 3,
    "bikeTypes": 2,
    "priceDetails": {
      "basePrice": 1400,
      "subtotal": 1400,
      "bulkDiscount": {
        "amount": 84,
        "percentage": 6
      },
      "surgeMultiplier": 1.05,
      "extraCharges": 0,
      "helmetCharges": 60,
      "taxes": 71.4,
      "gstPercentage": 5,
      "totalAmount": 1447.4
    },
    "helmetDetails": {
      "quantity": 4,
      "charges": 60,
      "message": "3 helmet(s) free (1 per bike), 1 additional helmet(s) charged at ₹60 each"
    },
    "computedDetails": {
      "durationInHours": 36,
      "durationInDays": 2,
      "isOverdue": false,
      "canExtend": true,
      "canCancel": true
    },
    "statusInfo": {
      "canMakePayment": true,
      "isPaymentCompleted": false,
      "isBookingActive": false,
      "isBookingCompleted": false,
      "isCancellable": true
    },
    "formattedDates": {
      "startDate": "Thu, 15 Aug 2025",
      "endDate": "Fri, 16 Aug 2025",
      "createdAt": "5 Aug 2025, 09:30 PM"
    },
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-05T21:30:45.123Z",
    "updatedAt": "2025-08-05T21:30:45.123Z"
  }
}
```

### Success Response (200) - Hotel Booking:
```json
{
  "success": true,
  "data": {
    "_id": "68933f8512e787cd85646313",
    "user": {
      "_id": "67f1144bcdc79a816b7b4865",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "mobile": "9876543211"
    },
    "bookingType": "hotel",
    "hotel": {
      "_id": "65e5a8a1fc13ae1234000201",
      "name": "Grand Hotel Mumbai",
      "description": "Luxury hotel in the heart of Mumbai",
      "location": "Marine Drive, Mumbai",
      "images": [
        "https://example.com/hotel1.jpg",
        "https://example.com/hotel2.jpg"
      ],
      "amenities": ["WiFi", "Swimming Pool", "Spa", "Restaurant"],
      "policies": ["Check-in: 2 PM", "Check-out: 12 PM", "No smoking"],
      "ratings": 4.8,
      "numReviews": 320,
      "checkInTime": "14:00",
      "checkOutTime": "12:00",
      "address": {
        "street": "123 Marine Drive",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "contactInfo": {
        "phone": "+91-22-12345678",
        "email": "info@grandhotel.com"
      }
    },
    "roomType": "Deluxe",
    "startDate": "2025-08-20T00:00:00.000Z",
    "endDate": "2025-08-22T00:00:00.000Z",
    "numberOfPeople": 2,
    "totalRooms": 1,
    "hotelDetails": {
      "roomOptions": {
        "bedAndBreakfast": {
          "quantity": 1,
          "pricePerUnit": 2500
        }
      },
      "checkInTime": "14:00"
    },
    "priceDetails": {
      "basePrice": 5000,
      "subtotal": 5000,
      "taxes": 900,
      "totalAmount": 5900
    },
    "computedDetails": {
      "nightsStayed": 2,
      "canCancel": true,
      "canModify": true
    },
    "statusInfo": {
      "canMakePayment": true,
      "isPaymentCompleted": false,
      "isBookingActive": false,
      "isBookingCompleted": false,
      "isCancellable": true
    },
    "formattedDates": {
      "startDate": "Wed, 20 Aug 2025",
      "endDate": "Fri, 22 Aug 2025",
      "createdAt": "5 Aug 2025, 10:15 PM"
    },
    "bookingStatus": "pending",
    "paymentStatus": "pending"
  }
}
```

---

## 2. Get Enhanced Order Details (Products)

**Endpoint:** `GET /api/orders/:id`
**Access:** Private
**Description:** Get comprehensive order details with enhanced product information

### CURL Example:
```bash
curl -X GET http://localhost:5000/api/orders/68933f8512e787cd85646314 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Success Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "68933f8512e787cd85646314",
    "user": {
      "_id": "67f1144bcdc79a816b7b4865",
      "name": "Mike Johnson",
      "email": "mike@example.com",
      "mobile": "9876543212",
      "profilePicture": "https://example.com/mike.jpg"
    },
    "products": [
      {
        "product": "65e5a8a1fc13ae1234000301",
        "quantity": 2,
        "price": 150
      },
      {
        "product": "65e5a8a1fc13ae1234000302",
        "quantity": 1,
        "price": 89
      }
    ],
    "productsWithDetails": [
      {
        "product": {
          "_id": "65e5a8a1fc13ae1234000301",
          "title": "Premium Bike Helmet",
          "description": "High-quality safety helmet with advanced ventilation",
          "images": [
            "https://example.com/helmet1.jpg",
            "https://example.com/helmet2.jpg"
          ],
          "category": "Accessories",
          "price": {
            "basePrice": 200,
            "discountedPrice": 150
          },
          "stock": 45,
          "isAvailable": true,
          "isBestseller": true,
          "ratings": 4.7,
          "numReviews": 89,
          "taxRate": 0.18,
          "finalPrice": 150,
          "discount": 25,
          "isDiscounted": true,
          "isLowStock": false,
          "isOutOfStock": false,
          "stockStatus": "In Stock",
          "totalValue": 300
        },
        "quantity": 2,
        "price": 150
      },
      {
        "product": {
          "_id": "65e5a8a1fc13ae1234000302",
          "title": "Energy Drink",
          "description": "Refreshing energy drink for bikers",
          "images": [
            "https://example.com/drink1.jpg"
          ],
          "category": "Beverages",
          "price": {
            "basePrice": 89,
            "discountedPrice": null
          },
          "stock": 8,
          "isAvailable": true,
          "isBestseller": false,
          "ratings": 4.2,
          "numReviews": 34,
          "taxRate": 0.12,
          "finalPrice": 89,
          "discount": 0,
          "isDiscounted": false,
          "isLowStock": true,
          "isOutOfStock": false,
          "stockStatus": "Low Stock",
          "totalValue": 89
        },
        "quantity": 1,
        "price": 89
      }
    ],
    "deliveryAddress": {
      "address": "123 Main Street, Apartment 4B",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "coordinates": {
        "latitude": 19.0760,
        "longitude": 72.8777
      }
    },
    "priceDetails": {
      "subtotal": 389,
      "taxes": 62.24,
      "deliveryCharge": 0,
      "discount": 0,
      "totalAmount": 451.24
    },
    "computedDetails": {
      "totalProducts": 3,
      "uniqueProducts": 2,
      "averageRating": 4.45,
      "canCancel": true,
      "canTrack": false,
      "isDelivered": false,
      "isCancelled": false,
      "estimatedDeliveryPassed": false
    },
    "statusInfo": {
      "canMakePayment": true,
      "isPaymentCompleted": false,
      "isOrderActive": false,
      "isOrderCompleted": false,
      "canRequestRefund": false
    },
    "formattedDates": {
      "orderDate": "Mon, 5 Aug 2025, 11:45 PM",
      "estimatedDelivery": "Thu, 8 Aug 2025",
      "actualDelivery": null
    },
    "deliveryInfo": {
      "address": {
        "address": "123 Main Street, Apartment 4B",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "coordinates": {
          "latitude": 19.0760,
          "longitude": 72.8777
        }
      },
      "hasCoordinates": true,
      "isDeliveryPending": false,
      "deliveryCharges": 0,
      "isFreeDelivery": true
    },
    "estimatedDeliveryDate": "2025-08-08T00:00:00.000Z",
    "orderStatus": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-05T23:45:30.123Z",
    "updatedAt": "2025-08-05T23:45:30.123Z"
  }
}
```

---

## Key Enhancements Added:

### 1. **Bike Booking Enhancements**
- **Complete Bike Details**: Title, brand, model, year, registration number, location, features
- **Pricing Information**: All pricing tiers (weekday/weekend, limited/unlimited)
- **Special Pricing**: Active special pricing periods with details
- **Availability Status**: Current availability, high demand indicators
- **Rental Duration**: Computed hours and days
- **Action Capabilities**: Can extend, cancel, make payment
- **Multiple Bike Support**: Total bikes, bike types, individual bike details

### 2. **Hotel Booking Enhancements**
- **Complete Hotel Details**: Name, description, location, amenities, policies
- **Contact Information**: Phone, email, address details
- **Room Information**: Total rooms booked, room options breakdown
- **Stay Duration**: Computed nights stayed
- **Check-in/Check-out**: Times and policies
- **Action Capabilities**: Can cancel, modify reservations

### 3. **Product Order Enhancements**
- **Complete Product Details**: Title, description, category, stock status
- **Pricing Information**: Base price, discounts, final price, discount percentage
- **Stock Status**: Low stock warnings, out of stock indicators
- **Product Statistics**: Ratings, reviews, bestseller status
- **Order Analytics**: Total products, unique products, average rating
- **Delivery Information**: Address, coordinates, delivery status
- **Tax Information**: Tax rates, tax calculations

### 4. **Common Enhancements**
- **Status Information**: Payment status, booking/order status, action capabilities
- **Formatted Dates**: User-friendly date formatting in Indian format
- **Computed Fields**: Duration calculations, status flags, action permissions
- **User Details**: Complete user information including profile pictures
- **Employee Information**: Assigned employee details with roles

### 5. **Frontend-Ready Data**
- **Action Flags**: canCancel, canExtend, canMakePayment, etc.
- **Status Indicators**: isOverdue, isHighDemand, isLowStock, etc.
- **Formatted Information**: Ready-to-display dates, prices, durations
- **Nested Details**: Organized data structure for easy frontend consumption

---

## Error Responses:

### 1. Booking/Order Not Found
**Status Code:** 404
```json
{
  "success": false,
  "message": "Booking not found"
}
```

### 2. Unauthorized Access
**Status Code:** 401
```json
{
  "success": false,
  "message": "Not authorized to access this booking"
}
```

---

## Notes:

- **Comprehensive Data**: All endpoints now provide complete information about products, bikes, and hotels
- **Computed Fields**: Ready-to-use calculated values for frontend display
- **Status Tracking**: Clear indicators for what actions are available
- **Multi-type Support**: Enhanced support for single bikes, multiple bikes, hotels, and products
- **Performance Optimized**: Efficient population queries with only necessary fields
- **User Experience**: Formatted dates, status messages, and action capabilities for better UX 