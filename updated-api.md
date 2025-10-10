# HappyGo Multi-Bike Booking System API Documentation

## Overview
This document provides API endpoints and examples for the updated multi-bike booking system with cart functionality, dynamic pricing, and corrected weekend logic.

## Key Changes Made

### 1. Weekend Definition Correction
- **Before**: Friday, Saturday, Sunday, Monday were considered weekend
- **After**: Only Saturday and Sunday are considered weekend
- **Impact**: Affects all pricing calculations and availability checks

### 2. New Pricing Structure
Each bike now has 4 pricing categories:
- `weekday.limitedKm` - Weekday limited kilometers pricing
- `weekday.unlimited` - Weekday unlimited kilometers pricing  
- `weekend.limitedKm` - Weekend limited kilometers pricing
- `weekend.unlimited` - Weekend unlimited kilometers pricing

### 3. Multi-Bike Cart System
- Users can add multiple bikes to cart before checkout
- Supports different quantities of same bike model
- Real-time availability checking
- Bulk discount calculations

### 4. Dynamic Pricing Features
- Special date pricing periods (admin configurable)
- Hidden surge pricing based on demand
- Visible bulk booking discounts

## Cart Management APIs

### Get Cart
\`\`\`bash
curl -X GET "http://localhost:5000/api/cart?startDate=2024-01-15&endDate=2024-01-15&startTime=08:00&endTime=20:00" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "_id": "cart_id",
    "user": "user_id",
    "items": [
      {
        "_id": "item_id",
        "bike": {
          "_id": "bike_id",
          "title": "Royal Enfield Classic 350",
          "brand": "Royal Enfield",
          "images": ["image_url"],
          "availableQuantity": 3
        },
        "quantity": 2,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 1600
      }
    ],
    "pricing": {
      "subtotal": 1600,
      "bulkDiscount": {
        "amount": 32,
        "percentage": 2
      },
      "surgeMultiplier": 1.05,
      "extraCharges": 100,
      "gst": 87.78,
      "total": 1755.78
    },
    "helmetDetails": {
      "quantity": 2,
      "charges": 60
    }
  }
}
\`\`\`

### Add Item to Cart
\`\`\`bash
curl -X POST "http://localhost:5000/api/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "bikeId": "bike_id_here",
    "quantity": 2,
    "kmOption": "unlimited",
    "startDate": "2024-01-15",
    "endDate": "2024-01-15",
    "startTime": "08:00",
    "endTime": "20:00"
  }'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    // Updated cart object
  },
  "message": "Added 2 bikes to cart",
  "savings": "You saved ₹32.00 with bulk booking!"
}
\`\`\`

### Update Cart Item Quantity
\`\`\`bash
curl -X PUT "http://localhost:5000/api/cart/items/ITEM_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 3
  }'
\`\`\`

### Remove Item from Cart
\`\`\`bash
curl -X DELETE "http://localhost:5000/api/cart/items/ITEM_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

### Update Helmet Quantity
\`\`\`bash
curl -X PUT "http://localhost:5000/api/cart/helmets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quantity": 3
  }'
\`\`\`

## Updated Bike APIs

### Get Available Bikes (Updated)
\`\`\`bash
curl -X GET "http://localhost:5000/api/bikes/available?startDate=2024-01-15&endDate=2024-01-15&startTime=08:00&endTime=20:00"
\`\`\`

**Response (Updated):**
\`\`\`json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "bike_id",
      "title": "Royal Enfield Classic 350",
      "brand": "Royal Enfield",
      "pricePerDay": {
        "weekday": {
          "limitedKm": {
            "price": 600,
            "kmLimit": 60,
            "isActive": true
          },
          "unlimited": {
            "price": 800,
            "isActive": true
          }
        },
        "weekend": {
          "limitedKm": {
            "price": 800,
            "kmLimit": 60,
            "isActive": true
          },
          "unlimited": {
            "price": 1000,
            "isActive": true
          }
        }
      },
      "specialPricing": [
        {
          "name": "Diwali Special",
          "startDate": "2024-01-10",
          "endDate": "2024-01-20",
          "priceMultiplier": 1.5,
          "isActive": true
        }
      ],
      "totalQuantity": 5,
      "bookedQuantity": 2,
      "availableQuantity": 3,
      "isAvailable": true,
      "priceLimited": {
        "totalPrice": 945,
        "breakdown": {
          "basePrice": 900,
          "specialPricing": 1.5,
          "surgeMultiplier": 1.05,
          "gst": 45,
          "total": 945
        }
      },
      "priceUnlimited": {
        "totalPrice": 1260,
        "breakdown": {
          "basePrice": 1200,
          "specialPricing": 1.5,
          "surgeMultiplier": 1.05,
          "gst": 60,
          "total": 1260
        }
      }
    }
  ]
}
\`\`\`

### Get Single Bike (Updated)
\`\`\`bash
curl -X GET "http://localhost:5000/api/bikes/BIKE_ID?startDate=2024-01-15&endDate=2024-01-15&startTime=08:00&endTime=20:00&kmOption=unlimited&quantity=2"
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "_id": "bike_id",
    "title": "Royal Enfield Classic 350",
    "availability": {
      "total": 5,
      "booked": 2,
      "available": 3
    },
    "pricing": {
      "totalPrice": 2520,
      "breakdown": {
        "quantity": 2,
        "pricePerUnit": 1200,
        "basePrice": 2400,
        "bulkDiscount": {
          "percentage": 2,
          "amount": 48
        },
        "specialPricing": 1.5,
        "surgeMultiplier": 1.05,
        "gst": 120,
        "total": 2520
      }
    },
    "helmetInfo": {
      "available": 15,
      "pricePerHelmet": 60,
      "freeHelmetPerBooking": 1,
      "maxQuantity": 15
    }
  }
}
\`\`\`

## Special Pricing Management APIs

### Add Special Pricing Period
\`\`\`bash
curl -X POST "http://localhost:5000/api/bikes/BIKE_ID/special-pricing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "name": "New Year Special",
    "startDate": "2024-12-25",
    "endDate": "2024-01-05",
    "priceMultiplier": 2.0
  }'
\`\`\`

### Update Special Pricing Period
\`\`\`bash
curl -X PUT "http://localhost:5000/api/bikes/BIKE_ID/special-pricing/PRICING_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "name": "Updated New Year Special",
    "priceMultiplier": 1.8,
    "isActive": true
  }'
\`\`\`

### Delete Special Pricing Period
\`\`\`bash
curl -X DELETE "http://localhost:5000/api/bikes/BIKE_ID/special-pricing/PRICING_ID" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
\`\`\`

## Updated Bike Creation/Update APIs

### Create Bike (Updated Schema)
\`\`\`bash
curl -X POST "http://localhost:5000/api/bikes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "title": "Royal Enfield Classic 350",
    "description": "Classic motorcycle",
    "brand": "Royal Enfield",
    "model": "Classic 350",
    "year": 2023,
    "quantity": 5,
    "pricePerDay": {
      "weekday": {
        "limitedKm": {
          "price": 600,
          "kmLimit": 60,
          "isActive": true
        },
        "unlimited": {
          "price": 800,
          "isActive": true
        }
      },
      "weekend": {
        "limitedKm": {
          "price": 800,
          "kmLimit": 60,
          "isActive": true
        },
        "unlimited": {
          "price": 1000,
          "isActive": true
        }
      }
    },
    "bulkDiscounts": {
      "twoOrMore": 2,
      "threeToFour": 4,
      "fiveOrMore": 10
    },
    "additionalKmPrice": 5,
    "registrationNumber": "KA01AB1234",
    "location": "Bangalore",
    "images": ["base64_image_string"]
  }'
\`\`\`

## Multi-Bike Booking Creation

### Create Multi-Bike Booking from Cart
\`\`\`bash
curl -X POST "http://localhost:5000/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "bookingType": "bike",
    "startDate": "2024-01-15",
    "endDate": "2024-01-15",
    "startTime": "08:00",
    "endTime": "20:00",
    "bikeItems": [
      {
        "bike": "bike_id_1",
        "quantity": 2,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 1600
      },
      {
        "bike": "bike_id_2", 
        "quantity": 1,
        "kmOption": "limited",
        "pricePerUnit": 600,
        "totalPrice": 600
      }
    ],
    "priceDetails": {
      "subtotal": 2200,
      "bulkDiscount": {
        "amount": 88,
        "percentage": 4
      },
      "surgeMultiplier": 1.05,
      "extraCharges": 100,
      "gst": 110.6,
      "totalAmount": 2322.6
    },
    "helmetDetails": {
      "quantity": 3,
      "charges": 120
    }
  }'
\`\`\`

## Pricing Logic Examples

### Weekend Pricing Logic
- **Scenario 1**: Friday to Saturday booking → Weekend pricing (Saturday is weekend)
- **Scenario 2**: Thursday to Friday booking → Weekday pricing (no weekend days)
- **Scenario 3**: Saturday to Monday booking → Weekend pricing (Saturday and Sunday are weekends)

### Bulk Discount Examples
- **2 bikes**: 2% discount on total
- **3-4 bikes**: 4% discount on total  
- **5+ bikes**: 10% discount on total

### Surge Pricing (Hidden)
- **0-4 total bikes booked**: Normal price
- **5-10 total bikes booked**: 5% price increase
- **10+ total bikes booked**: 10% price increase

### Special Pricing Examples
- **Diwali Week**: 50% price increase (multiplier: 1.5)
- **New Year Period**: 100% price increase (multiplier: 2.0)
- **Festival Season**: Custom rates (multiplier: 1.2-3.0)

## Error Responses

### Cart Errors
\`\`\`json
{
  "success": false,
  "message": "Only 2 bikes available for the selected period",
  "error": "INSUFFICIENT_AVAILABILITY"
}
\`\`\`

### Pricing Errors
\`\`\`json
{
  "success": false,
  "message": "unlimited km option not available for weekend",
  "error": "PRICING_OPTION_UNAVAILABLE"
}
\`\`\`

### Validation Errors
\`\`\`json
{
  "success": false,
  "message": "Quantity must be between 1 and 10",
  "error": "INVALID_QUANTITY"
}
\`\`\`

## Summary of Updates

1. **Weekend Logic**: Changed from Fri-Mon to Sat-Sun only
2. **Pricing Structure**: 4 categories per bike (weekday/weekend × limited/unlimited)
3. **Cart System**: Full shopping cart experience with real-time pricing
4. **Bulk Discounts**: Transparent discounts for multiple bikes
5. **Surge Pricing**: Hidden demand-based pricing adjustments
6. **Special Pricing**: Admin-configurable special date periods
7. **Quantity Tracking**: Proper inventory management with availability counts
8. **Multi-Bike Bookings**: Support for booking multiple bikes in single transaction

The system now provides a complete e-commerce experience for bike rentals with sophisticated pricing logic and inventory management.
