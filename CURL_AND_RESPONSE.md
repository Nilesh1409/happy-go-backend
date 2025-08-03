# API Documentation: Happy-Go Bike Rentals

This document outlines the API changes for the new shopping cart and dynamic pricing features. It is intended for frontend developers and for testing purposes.

---

## 1. Booking API

### Create Booking (Shopping Cart)

This is a new feature that allows a user to book multiple bikes of the same or different types in a single transaction.

- **Endpoint:** `POST /api/bookings`
- **Authentication:** `Bearer <USER_TOKEN>`

**Request Body:**

```json
{
    "bookingType": "bike",
    "startDate": "2024-09-10",
    "endDate": "2024-09-12",
    "startTime": "10:00",
    "endTime": "18:00",
    "bikes": [
        {
            "bikeId": "60d5f1b4e6b3f1a2b4c8d9e0",
            "quantity": 2,
            "kmOption": "limited"
        },
        {
            "bikeId": "60d5f1b4e6b3f1a2b4c8d9e1",
            "quantity": 1,
            "kmOption": "unlimited"
        }
    ],
    "helmetQuantity": 3,
    "guestDetails": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "mobile": "9876543210"
    }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/bookings \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <USER_TOKEN>" \
-d '{ "bookingType": "bike", "startDate": "2024-09-10", "endDate": "2024-09-12", "startTime": "10:00", "endTime": "18:00", "bikes": [ { "bikeId": "60d5f1b4e6b3f1a2b4c8d9e0", "quantity": 2, "kmOption": "limited" }, { "bikeId": "60d5f1b4e6b3f1a2b4c8d9e1", "quantity": 1, "kmOption": "unlimited" } ], "helmetQuantity": 3, "guestDetails": { "name": "John Doe", "email": "john.doe@example.com", "mobile": "9876543210" } }'
```

**Success Response (201 Created):**

This response shows a booking for 3 bikes in total. A bulk discount of 4% has been applied.

```json
{
    "success": true,
    "data": {
        "bookingType": "bike",
        "startDate": "2024-09-10T00:00:00.000Z",
        "endDate": "2024-09-12T00:00:00.000Z",
        "startTime": "10:00",
        "endTime": "18:00",
        "bikes": [
            {
                "bike": "60d5f1b4e6b3f1a2b4c8d9e0",
                "quantity": 2,
                "kmOption": "limited",
                "kmLimit": 60,
                "additionalKmPrice": 5,
                "_id": "60d5f2b4e6b3f1a2b4c8d9e2"
            },
            {
                "bike": "60d5f1b4e6b3f1a2b4c8d9e1",
                "quantity": 1,
                "kmOption": "unlimited",
                "kmLimit": null,
                "additionalKmPrice": 5,
                "_id": "60d5f2b4e6b3f1a2b4c8d9e3"
            }
        ],
        "priceDetails": {
            "basePrice": 8400,
            "discount": 336,
            "helmetCharges": 120,
            "taxes": 409.2,
            "gstPercentage": 5,
            "totalAmount": 8593.2
        },
        "helmetQuantity": 3,
        "bookingStatus": "pending",
        "_id": "60d5f2b4e6b3f1a2b4c8d9e4",
        "user": "60d5f0b4e6b3f1a2b4c8d9d0",
        "createdAt": "2024-07-29T10:05:00.000Z",
        "updatedAt": "2024-07-29T10:05:00.000Z"
    }
}
```

**Error Response (400 Bad Request - Not enough bikes):**

```json
{
    "success": false,
    "error": "Not enough units for Speedster SX-1000. Only 1 available."
}
```

---

## 2. Bike API

### Create a new Bike (Admin)

This endpoint is updated to support the new, more detailed pricing structure.

- **Endpoint:** `POST /api/bikes`
- **Authentication:** `Bearer <ADMIN_TOKEN>`

**Request Body:**

```json
{
    "title": "Mountain Mover",
    "description": "A sturdy bike for tough terrains.",
    "brand": "RockRider",
    "model": "RR-500",
    "year": 2024,
    "pricePerDay": {
        "weekday": {
            "limited": { "price": 1000, "kmLimit": 80, "isActive": true },
            "unlimited": { "price": 1500, "isActive": true }
        },
        "weekend": {
            "limited": { "price": 1200, "kmLimit": 80, "isActive": true },
            "unlimited": { "price": 1800, "isActive": true }
        }
    },
    "additionalKmPrice": 6,
    "quantity": 5,
    "location": "Main Branch",
    "registrationNumber": "MH01AB1234"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/bikes -H "Content-Type: application/json" -H "Authorization: Bearer <ADMIN_TOKEN>" -d '{"title": "Mountain Mover", "description": "A sturdy bike for tough terrains.", "brand": "RockRider", "model": "RR-500", "year": 2024, "pricePerDay": { "weekday": { "limited": { "price": 1000, "kmLimit": 80, "isActive": true }, "unlimited": { "price": 1500, "isActive": true } }, "weekend": { "limited": { "price": 1200, "kmLimit": 80, "isActive": true }, "unlimited": { "price": 1800, "isActive": true } } }, "additionalKmPrice": 6, "quantity": 5, "location": "Main Branch", "registrationNumber": "MH01AB1234" }'
```

**Success Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "pricePerDay": {
            "weekday": {
                "limited": { "price": 1000, "kmLimit": 80, "isActive": true },
                "unlimited": { "price": 1500, "isActive": true }
            },
            "weekend": {
                "limited": { "price": 1200, "kmLimit": 80, "isActive": true },
                "unlimited": { "price": 1800, "isActive": true }
            }
        },
        "availableQuantity": 5,
        "status": "available",
        "_id": "60d5f1b4e6b3f1a2b4c8d9e0",
        "title": "Mountain Mover",
        "description": "A sturdy bike for tough terrains.",
        "brand": "RockRider",
        "model": "RR-500",
        "year": 2024,
        "additionalKmPrice": 6,
        "quantity": 5,
        "location": "Main Branch",
        "registrationNumber": "MH01AB1234",
        "createdAt": "2024-07-29T12:00:00.000Z",
        "updatedAt": "2024-07-29T12:00:00.000Z"
    }
}
```

---

## 3. Admin API for Special Pricing

A new set of CRUD endpoints for an admin to manage special pricing periods.

### Create Special Price Period

- **Endpoint:** `POST /api/admin/special-price-periods`
- **Authentication:** `Bearer <ADMIN_TOKEN>`

**Request Body:**
```json
{
    "name": "New Year Gala 2025",
    "startDate": "2024-12-25",
    "endDate": "2025-01-02",
    "priceMultiplier": 2.0,
    "isActive": true
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/admin/special-price-periods -H "Content-Type: application/json" -H "Authorization: Bearer <ADMIN_TOKEN>" -d '{"name": "New Year Gala 2025", "startDate": "2024-12-25", "endDate": "2025-01-02", "priceMultiplier": 2.0, "isActive": true}'
```

**Success Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "name": "New Year Gala 2025",
        "startDate": "2024-12-25T00:00:00.000Z",
        "endDate": "2025-01-02T00:00:00.000Z",
        "priceMultiplier": 2,
        "isActive": true,
        "_id": "60d5f3b4e6b3f1a2b4c8d9f0",
        "createdAt": "2024-07-29T12:10:00.000Z",
        "updatedAt": "2024-07-29T12:10:00.000Z"
    }
}
```

### Get All Special Price Periods

- **Endpoint:** `GET /api/admin/special-price-periods`
- **Authentication:** `Bearer <ADMIN_TOKEN>`

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/admin/special-price-periods -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "count": 1,
    "data": [
        {
            "_id": "60d5f3b4e6b3f1a2b4c8d9f0",
            "name": "New Year Gala 2025",
            "startDate": "2024-12-25T00:00:00.000Z",
            "endDate": "2025-01-02T00:00:00.000Z",
            "priceMultiplier": 2,
            "isActive": true,
            "createdAt": "2024-07-29T12:10:00.000Z",
            "updatedAt": "2024-07-29T12:10:00.000Z"
        }
    ]
}
```

---

## Summary of Key Changes

This update introduces several major features and enhancements to the bike rental system.

1.  **Shopping Cart Feature**:
    *   The booking system has been completely overhauled to support multiple bike rentals in a single order.
    *   The `POST /api/bookings` endpoint now accepts an array of `bikes`, each with a `bikeId`, `quantity`, and `kmOption`.
    *   The backend handles availability checks for each bike in the cart and consolidates pricing.

2.  **Dynamic Pricing Engine**:
    *   **Tiered Pricing**: The bike model now stores four distinct prices: Weekday (Limited/Unlimited KM) and Weekend (Limited/Unlimited KM).
    *   **Weekend Definition**: The definition of a "weekend" has been corrected to Saturday and Sunday for all price calculations.
    *   **Special Pricing**: Admins can now define special pricing periods (e.g., for holidays) with a price multiplier via a new set of CRUD endpoints.
    *   **Surge Pricing**: A dynamic, hidden surge pricing model has been implemented. Prices automatically increase by 5% or 10% based on the total number of bikes booked on a given day.
    *   **Bulk Discounts**: The system now provides automatic, visible discounts for customers booking multiple bikes (2% for 2 bikes, 4% for 3-4 bikes, 10% for 5+ bikes).

3.  **Database Schema Changes**:
    *   The `bikes` model has a new `pricePerDay` structure to accommodate the tiered pricing.
    *   A new `specialpriceperiods` collection has been added.
    *   The `bookings` model was significantly changed: the single `bike` field was replaced with a `bikes` array to support the shopping cart.

4.  **Codebase Refactoring**:
    *   Numerous controller functions and utility modules were updated to support the new data models and business logic.
    *   Functions that were incompatible with the new multi-bike booking model (like `extendBooking`) have been temporarily disabled to ensure stability, with `TODO` markers for future enhancement.
