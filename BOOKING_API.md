# Booking API Documentation

## Overview
The booking system now supports both single bike bookings (legacy) and multiple bike bookings in a single transaction. The system automatically calculates pricing including bulk discounts, surge pricing, helmet charges, and special pricing.

---

## 1. Create Single Bike Booking (Legacy Support)

**Endpoint:** `POST /api/bookings`
**Access:** Private
**Description:** Create a booking for a single bike (maintains backward compatibility)

### CURL Example:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "bookingType": "bike",
    "bikeId": "65e5a8a1fc13ae1234000101",
    "startDate": "2025-08-15",
    "endDate": "2025-08-15",
    "startTime": "08:00",
    "endTime": "20:00",
    "helmetQuantity": 1,
    "priceDetails": {
      "basePrice": 400,
      "subtotal": 400,
      "bulkDiscount": {
        "amount": 0,
        "percentage": 0
      },
      "surgeMultiplier": 1,
      "extraCharges": 0,
      "helmetCharges": 0,
      "taxes": 20,
      "gstPercentage": 5,
      "discount": 0,
      "totalAmount": 420
    },
    "bikeDetails": {
      "kmLimit": "Limited",
      "isUnlimited": false,
      "additionalKmPrice": 5,
      "helmetQuantity": 1,
      "helmetCharges": 0
    },
    "guestDetails": {
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "9876543210"
    },
    "specialRequests": "Please ensure bike is clean"
  }'
```

### Success Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "6891ec86ed75071437053a25",
    "user": "67f1144bcdc79a816b7b4865",
    "bookingType": "bike",
    "bike": "65e5a8a1fc13ae1234000101",
    "startDate": "2025-08-15T00:00:00.000Z",
    "endDate": "2025-08-15T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "20:00",
    "priceDetails": {
      "basePrice": 400,
      "subtotal": 400,
      "bulkDiscount": {
        "amount": 0,
        "percentage": 0
      },
      "surgeMultiplier": 1,
      "extraCharges": 0,
      "helmetCharges": 0,
      "taxes": 20,
      "gstPercentage": 5,
      "discount": 0,
      "totalAmount": 420
    },
    "bikeDetails": {
      "kmLimit": "Limited",
      "isUnlimited": false,
      "additionalKmPrice": 5,
      "helmetQuantity": 1,
      "helmetCharges": 0
    },
    "helmetDetails": {
      "quantity": 1,
      "charges": 0
    },
    "guestDetails": {
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "9876543210"
    },
    "specialRequests": "Please ensure bike is clean",
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-05T21:30:45.123Z",
    "updatedAt": "2025-08-05T21:30:45.123Z"
  }
}
```

---

## 2. Create Multiple Bike Booking

**Endpoint:** `POST /api/bookings`
**Access:** Private
**Description:** Create a booking for multiple bikes with different options

### CURL Example:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "bookingType": "bike",
    "bikeItems": [
      {
        "bike": "65e5a8a1fc13ae1234000101",
        "quantity": 2,
        "kmOption": "limited",
        "pricePerUnit": 400,
        "totalPrice": 800
      },
      {
        "bike": "65e5a8a1fc13ae1234000103",
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 600,
        "totalPrice": 600
      }
    ],
    "startDate": "2025-08-15",
    "endDate": "2025-08-16",
    "startTime": "08:00",
    "endTime": "20:00",
    "helmetQuantity": 4,
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
      "discount": 0,
      "totalAmount": 1447.4
    },
    "guestDetails": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "mobile": "9876543211"
    },
    "specialRequests": "Need bikes ready by 7:30 AM"
  }'
```

### Success Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "6891ec86ed75071437053a26",
    "user": "67f1144bcdc79a816b7b4865",
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
        ],
        "_id": "6891ec86ed75071437053a29"
      },
      {
        "bike": "65e5a8a1fc13ae1234000103",
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 600,
        "totalPrice": 600,
        "additionalKmPrice": 5,
        "bikeUnits": [
          {
            "unitNumber": 1,
            "status": "pending",
            "_id": "6891ec86ed75071437053a2a"
          }
        ],
        "_id": "6891ec86ed75071437053a2b"
      }
    ],
    "startDate": "2025-08-15T00:00:00.000Z",
    "endDate": "2025-08-16T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "20:00",
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
      "discount": 0,
      "totalAmount": 1447.4
    },
    "helmetDetails": {
      "quantity": 4,
      "charges": 60
    },
    "guestDetails": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "mobile": "9876543211"
    },
    "specialRequests": "Need bikes ready by 7:30 AM",
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-05T21:35:12.456Z",
    "updatedAt": "2025-08-05T21:35:12.456Z"
  }
}
```

---

## 3. Create Booking from Cart

**Endpoint:** `POST /api/bookings`
**Access:** Private
**Description:** Create a booking directly from cart data

### CURL Example:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "bookingType": "bike",
    "bikeItems": [
      {
        "bike": "65e5a8a1fc13ae1234000101",
        "quantity": 1,
        "kmOption": "limited",
        "pricePerUnit": 800,
        "totalPrice": 840
      },
      {
        "bike": "65e5a8a1fc13ae1234000103",
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 200,
        "totalPrice": 210
      }
    ],
    "startDate": "2025-12-31",
    "endDate": "2025-12-31",
    "startTime": "08:00",
    "endTime": "20:00",
    "helmetQuantity": 3,
    "priceDetails": {
      "basePrice": 1000,
      "subtotal": 1000,
      "bulkDiscount": {
        "amount": 40,
        "percentage": 4
      },
      "surgeMultiplier": 1,
      "extraCharges": 0,
      "helmetCharges": 60,
      "taxes": 51,
      "gstPercentage": 5,
      "totalAmount": 1071
    },
    "guestDetails": {
      "name": "Mike Johnson",
      "email": "mike@example.com",
      "mobile": "9876543212"
    }
  }'
```

### Success Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "6891ec86ed75071437053a2c",
    "user": "67f1144bcdc79a816b7b4865",
    "bookingType": "bike",
    "bikeItems": [
      {
        "bike": "65e5a8a1fc13ae1234000101",
        "quantity": 1,
        "kmOption": "limited",
        "pricePerUnit": 800,
        "totalPrice": 840,
        "kmLimit": 60,
        "additionalKmPrice": 5,
        "bikeUnits": [
          {
            "unitNumber": 1,
            "status": "pending",
            "_id": "6891ec86ed75071437053a2d"
          }
        ],
        "_id": "6891ec86ed75071437053a2e"
      },
      {
        "bike": "65e5a8a1fc13ae1234000103",
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 200,
        "totalPrice": 210,
        "additionalKmPrice": 5,
        "bikeUnits": [
          {
            "unitNumber": 1,
            "status": "pending",
            "_id": "6891ec86ed75071437053a2f"
          }
        ],
        "_id": "6891ec86ed75071437053a30"
      }
    ],
    "startDate": "2025-12-31T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "20:00",
    "priceDetails": {
      "basePrice": 1000,
      "subtotal": 1000,
      "bulkDiscount": {
        "amount": 40,
        "percentage": 4
      },
      "surgeMultiplier": 1,
      "extraCharges": 0,
      "helmetCharges": 60,
      "taxes": 51,
      "gstPercentage": 5,
      "totalAmount": 1071
    },
    "helmetDetails": {
      "quantity": 3,
      "charges": 60
    },
    "guestDetails": {
      "name": "Mike Johnson",
      "email": "mike@example.com",
      "mobile": "9876543212"
    },
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-05T21:40:30.789Z",
    "updatedAt": "2025-08-05T21:40:30.789Z"
  }
}
```

---

## 4. Weekend Booking (Unlimited Only)

**Endpoint:** `POST /api/bookings`
**Access:** Private
**Description:** Weekend bookings only allow unlimited km option

### CURL Example:
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "bookingType": "bike",
    "bikeItems": [
      {
        "bike": "65e5a8a1fc13ae1234000101",
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 800
      }
    ],
    "startDate": "2025-08-16",
    "endDate": "2025-08-17",
    "startTime": "08:00",
    "endTime": "20:00",
    "helmetQuantity": 1,
    "priceDetails": {
      "basePrice": 1600,
      "subtotal": 1600,
      "bulkDiscount": {
        "amount": 0,
        "percentage": 0
      },
      "surgeMultiplier": 1,
      "extraCharges": 0,
      "helmetCharges": 0,
      "taxes": 80,
      "gstPercentage": 5,
      "totalAmount": 1680
    }
  }'
```

### Success Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "6891ec86ed75071437053a31",
    "user": "67f1144bcdc79a816b7b4865",
    "bookingType": "bike",
    "bikeItems": [
      {
        "bike": "65e5a8a1fc13ae1234000101",
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 800,
        "additionalKmPrice": 5,
        "bikeUnits": [
          {
            "unitNumber": 1,
            "status": "pending",
            "_id": "6891ec86ed75071437053a32"
          }
        ],
        "_id": "6891ec86ed75071437053a33"
      }
    ],
    "startDate": "2025-08-16T00:00:00.000Z",
    "endDate": "2025-08-17T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "20:00",
    "priceDetails": {
      "basePrice": 1600,
      "subtotal": 1600,
      "bulkDiscount": {
        "amount": 0,
        "percentage": 0
      },
      "surgeMultiplier": 1,
      "extraCharges": 0,
      "helmetCharges": 0,
      "taxes": 80,
      "gstPercentage": 5,
      "totalAmount": 1680
    },
    "helmetDetails": {
      "quantity": 1,
      "charges": 0
    },
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "createdAt": "2025-08-05T21:45:15.012Z",
    "updatedAt": "2025-08-05T21:45:15.012Z"
  }
}
```

---

## Error Responses

### 1. Missing Required Fields
**Status Code:** 400
```json
{
  "success": false,
  "message": "Please provide startDate, endDate, startTime, endTime and priceDetails"
}
```

### 2. Invalid Booking Type
**Status Code:** 400
```json
{
  "success": false,
  "message": "Invalid booking type"
}
```

### 3. Missing Bike Information
**Status Code:** 400
```json
{
  "success": false,
  "message": "Please provide either bikeId with bikeDetails for single bike or bikeItems array for multiple bikes"
}
```

### 4. Bike Not Found
**Status Code:** 404
```json
{
  "success": false,
  "message": "Bike with ID 65e5a8a1fc13ae1234000101 not found"
}
```

### 5. Bike Not Available
**Status Code:** 400
```json
{
  "success": false,
  "message": "Only 2 units of Activa 5G are available for the selected period"
}
```

### 6. Weekend Limited KM Error
**Status Code:** 400
```json
{
  "success": false,
  "message": "Limited km option is not available for Activa 5G on weekend bookings. Please select unlimited km option."
}
```

### 7. Pricing Option Not Available
**Status Code:** 400
```json
{
  "success": false,
  "message": "Limited km option is not available for Honda Activa 6G on weekend bookings"
}
```

### 8. Helmet Availability Error
**Status Code:** 400
```json
{
  "success": false,
  "message": "Only 15 helmets available for the selected period"
}
```

### 9. Helmet Charges Mismatch
**Status Code:** 400
```json
{
  "success": false,
  "message": "Helmet charges calculation mismatch. Please refresh and try again."
}
```

### 10. Invalid Date/Time Format
**Status Code:** 400
```json
{
  "success": false,
  "message": "Invalid date or time format"
}
```

### 11. Invalid Date Range
**Status Code:** 400
```json
{
  "success": false,
  "message": "Start date/time must be before end date/time"
}
```

### 12. Incomplete Bike Item Data
**Status Code:** 400
```json
{
  "success": false,
  "message": "Each bike item must have bike, quantity, and kmOption"
}
```

---

## Key Features of Updated Booking System:

### 1. **Dual Support**
- Single bike bookings (legacy compatibility)
- Multiple bike bookings (new feature)

### 2. **Automatic Calculations**
- Bulk discounts based on total quantity
- Surge pricing (5% per group of 5 bookings)
- Helmet charges (1 free per bike)
- Special date pricing support
- GST calculation

### 3. **Advanced Validation**
- Real-time availability checking
- Weekend rule enforcement (unlimited only)
- Pricing option validation
- Helmet availability verification

### 4. **Comprehensive Tracking**
- Individual bike unit tracking
- Helmet quantity and charges
- Detailed pricing breakdown
- Email confirmations

### 5. **Flexible Structure**
- Supports both `bikeItems` array and legacy `bike` + `bikeDetails`
- Maintains backward compatibility
- Extensible for future features

---

## Notes:

- **Legacy Support**: Single bike bookings using `bikeId` and `bikeDetails` continue to work
- **New Format**: Multiple bike bookings use `bikeItems` array with individual bike configurations
- **Weekend Rule**: Limited KM option is not available for weekend bookings
- **Helmet Pricing**: 1 free helmet per bike, additional helmets charged at standard rate
- **Surge Pricing**: Applied based on total bookings in the system (5% per 5-booking group)
- **Bulk Discounts**: Applied automatically based on total bike quantity
- **Special Pricing**: Takes priority over regular weekday/weekend pricing when applicable
- **Email Notifications**: Automatic confirmation emails sent to users
- **Real-time Validation**: Server-side availability and pricing validation 