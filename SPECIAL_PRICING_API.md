# Special Pricing API Documentation

## Overview
Special pricing allows setting custom prices for specific date ranges, with separate pricing for limited km and unlimited km options that can be enabled/disabled independently.

---

## 1. Add Special Pricing Period

**Endpoint:** `POST /api/bikes/:id/special-pricing`
**Access:** Private/Admin
**Description:** Add a new special pricing period to a bike

### CURL Example:
```bash
curl -X POST http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "New Year Special",
    "startDate": "2025-12-31",
    "endDate": "2026-01-02",
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
    }
  }'
```

### Success Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "65e5a8a1fc13ae1234000101",
    "title": "Activa 5G",
    "brand": "Royal Enfield",
    "model": "Classic 350",
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
        "isActive": true,
        "createdBy": "6806a40917f93c71f412b1ea",
        "_id": "6891ec86ed75071437053a20"
      }
    ]
  },
  "message": "Special pricing period added successfully"
}
```

### Error Responses:

**400 - Missing Fields:**
```json
{
  "success": false,
  "message": "Please provide all required fields"
}
```

**400 - No Active Pricing:**
```json
{
  "success": false,
  "message": "At least one pricing option (limited or unlimited) must be active with a price"
}
```

**400 - Invalid Date Range:**
```json
{
  "success": false,
  "message": "Start date must be before end date"
}
```

**404 - Bike Not Found:**
```json
{
  "success": false,
  "message": "Bike not found"
}
```

---

## 2. Update Special Pricing Period

**Endpoint:** `PUT /api/bikes/:id/special-pricing/:pricingId`
**Access:** Private/Admin
**Description:** Update an existing special pricing period

### CURL Example - Update Name and Dates:
```bash
curl -X PUT http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing/6891ec86ed75071437053a20 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Extended New Year Special",
    "startDate": "2025-12-30",
    "endDate": "2026-01-03"
  }'
```

### CURL Example - Update Pricing Only:
```bash
curl -X PUT http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing/6891ec86ed75071437053a20 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "pricing": {
      "limitedKm": {
        "price": 900,
        "kmLimit": 80,
        "isActive": true
      },
      "unlimited": {
        "price": 1500,
        "isActive": false
      }
    }
  }'
```

### CURL Example - Disable Special Pricing:
```bash
curl -X PUT http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing/6891ec86ed75071437053a20 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "isActive": false
  }'
```

### Success Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "65e5a8a1fc13ae1234000101",
    "title": "Activa 5G",
    "specialPricing": [
      {
        "name": "Extended New Year Special",
        "startDate": "2025-12-30T00:00:00.000Z",
        "endDate": "2026-01-03T00:00:00.000Z",
        "pricing": {
          "limitedKm": {
            "price": 900,
            "kmLimit": 80,
            "isActive": true
          },
          "unlimited": {
            "price": 1500,
            "isActive": false
          }
        },
        "isActive": true,
        "createdBy": "6806a40917f93c71f412b1ea",
        "_id": "6891ec86ed75071437053a20"
      }
    ]
  },
  "message": "Special pricing period updated successfully"
}
```

### Error Responses:

**400 - No Active Pricing:**
```json
{
  "success": false,
  "message": "At least one pricing option (limited or unlimited) must be active with a price"
}
```

**404 - Bike Not Found:**
```json
{
  "success": false,
  "message": "Bike not found"
}
```

**404 - Special Pricing Not Found:**
```json
{
  "success": false,
  "message": "Special pricing period not found"
}
```

---

## 3. Get Special Pricing Periods

**Endpoint:** `GET /api/bikes/:id/special-pricing`
**Access:** Private/Employee or Admin
**Description:** Get all special pricing periods for a bike

### CURL Example:
```bash
curl -X GET http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Success Response (200):
```json
{
  "success": true,
  "count": 2,
  "data": [
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
      "isActive": true,
      "createdBy": {
        "_id": "6806a40917f93c71f412b1ea",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "_id": "6891ec86ed75071437053a20"
    },
    {
      "name": "Independence Day Special",
      "startDate": "2025-08-13T00:00:00.000Z",
      "endDate": "2025-08-15T00:00:00.000Z",
      "pricing": {
        "limitedKm": {
          "price": 600,
          "kmLimit": 60,
          "isActive": false
        },
        "unlimited": {
          "price": 1000,
          "isActive": true
        }
      },
      "isActive": true,
      "createdBy": {
        "_id": "6806a40917f93c71f412b1ea",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "_id": "6891ec86ed75071437053a21"
    }
  ],
  "message": "Special pricing periods retrieved successfully"
}
```

### Error Response:

**404 - Bike Not Found:**
```json
{
  "success": false,
  "message": "Bike not found"
}
```

---

## 4. Delete Special Pricing Period

**Endpoint:** `DELETE /api/bikes/:id/special-pricing/:pricingId`
**Access:** Private/Admin
**Description:** Delete a special pricing period

### CURL Example:
```bash
curl -X DELETE http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing/6891ec86ed75071437053a20 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Success Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "65e5a8a1fc13ae1234000101",
    "title": "Activa 5G",
    "specialPricing": [
      // Remaining special pricing periods (if any)
    ]
  },
  "message": "Special pricing period deleted successfully"
}
```

### Error Responses:

**404 - Bike Not Found:**
```json
{
  "success": false,
  "message": "Bike not found"
}
```

---

## 5. Get Available Bikes (with Special Pricing)

**Endpoint:** `GET /api/bikes/available`
**Access:** Public
**Description:** Get available bikes with pricing calculations including special pricing

### CURL Example:
```bash
curl -X GET "http://localhost:5000/api/bikes/available?startDate=2025-12-31&endDate=2026-01-01&startTime=08:00&endTime=20:00"
```

### Success Response (200) - During Special Pricing Period:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "65e5a8a1fc13ae1234000101",
      "title": "Activa 5G",
      "brand": "Royal Enfield",
      "model": "Classic 350",
      "isAvailable": true,
      "availableQuantity": 5,
      "totalQuantity": 10,
      "bookedQuantity": 5,
      "priceLimited": {
        "totalPrice": 840,
        "breakdown": {
          "type": "special_date",
          "duration": "1 day(s)",
          "basePrice": 800,
          "quantity": 1,
          "pricePerUnit": 800,
          "extraCharges": 0,
          "subtotal": 800,
          "bulkDiscount": {
            "percentage": 0,
            "amount": 0
          },
          "specialPricing": "New Year Special",
          "gst": 40,
          "gstPercentage": 5,
          "total": 840
        },
        "isWeekendBooking": false
      },
      "priceUnlimited": {
        "totalPrice": 1260,
        "breakdown": {
          "type": "special_date",
          "duration": "1 day(s)",
          "basePrice": 1200,
          "quantity": 1,
          "pricePerUnit": 1200,
          "extraCharges": 0,
          "subtotal": 1200,
          "bulkDiscount": {
            "percentage": 0,
            "amount": 0
          },
          "specialPricing": "New Year Special",
          "gst": 60,
          "gstPercentage": 5,
          "total": 1260
        },
        "isWeekendBooking": false
      },
      "searchPeriod": {
        "startDate": "2025-12-31",
        "endDate": "2026-01-01",
        "startTime": "08:00",
        "endTime": "20:00"
      }
    }
  ]
}
```

---

## 6. Calculate Rental Pricing (with Special Pricing)

**Endpoint:** `GET /api/bikes/:id`
**Access:** Public
**Description:** Get bike details with pricing calculations

### CURL Example - During Special Pricing:
```bash
curl -X GET "http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101?startDate=2025-12-31&endDate=2026-01-01&startTime=08:00&endTime=20:00&kmOption=limited&quantity=2"
```

### Success Response (200) - Special Pricing Applied:
```json
{
  "success": true,
  "data": {
    "_id": "65e5a8a1fc13ae1234000101",
    "title": "Activa 5G",
    "brand": "Royal Enfield",
    "model": "Classic 350",
    "availability": {
      "total": 10,
      "booked": 5,
      "available": 5
    },
    "pricing": {
      "totalPrice": 1680,
      "breakdown": {
        "type": "special_date",
        "duration": "1 day(s)",
        "basePrice": 1600,
        "quantity": 2,
        "pricePerUnit": 800,
        "extraCharges": 0,
        "subtotal": 1600,
        "bulkDiscount": {
          "percentage": 2,
          "amount": 32
        },
        "specialPricing": "New Year Special",
        "gst": 78.4,
        "gstPercentage": 5,
        "total": 1680
      },
      "kmOption": "limited",
      "isWeekendBooking": false,
      "quantity": 2
    },
    "helmetInfo": {
      "available": 15,
      "pricePerHelmet": 60,
      "freeHelmetPerBooking": 1,
      "maxQuantity": 15
    }
  }
}
```

---

## Error Cases for Special Pricing

### 1. When Special Pricing is Configured but Option Not Available:

**CURL Example:**
```bash
curl -X GET "http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101?startDate=2025-08-14&endDate=2025-08-14&startTime=08:00&endTime=20:00&kmOption=limited"
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "limited km option not available for special date or pricing not configured"
}
```

### 2. When Adding Special Pricing with Invalid Data:

**CURL Example:**
```bash
curl -X POST http://localhost:5000/api/bikes/65e5a8a1fc13ae1234000101/special-pricing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Invalid Special",
    "startDate": "2025-12-31",
    "endDate": "2026-01-02",
    "pricing": {
      "limitedKm": {
        "price": 0,
        "isActive": false
      },
      "unlimited": {
        "price": 0,
        "isActive": false
      }
    }
  }'
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "At least one pricing option (limited or unlimited) must be active with a price"
}
```

---

## Key Features of Updated Special Pricing:

1. **Actual Price Values**: Set specific prices instead of percentage multipliers
2. **Independent Options**: Enable/disable limited km and unlimited km options separately
3. **Custom KM Limits**: Set different km limits for limited option on special dates
4. **Priority System**: Special pricing takes precedence over weekday/weekend pricing
5. **Validation**: Ensures at least one pricing option is active
6. **Backward Compatibility**: Maintains existing API structure while adding new functionality

---

## Notes:

- Special pricing takes priority over regular weekday/weekend pricing when dates overlap
- If both limited and unlimited options are disabled, the API will return an error
- Special pricing applies to the entire booking period if any part overlaps with the special period
- Default km limit is 60 if not specified for limited option
- All prices are in the base currency (₹ INR)
- GST is calculated at 5% on the final amount after discounts 