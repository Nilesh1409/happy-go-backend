# 🛒 Unified Cart Implementation Guide

Complete guide for the new unified cart system that supports both bikes and hostels in a single cart.

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Cart Structure](#cart-structure)
3. [API Endpoints](#api-endpoints)
4. [Add Bike to Cart](#add-bike-to-cart)
5. [Add Hostel to Cart](#add-hostel-to-cart)
6. [Get Cart Details](#get-cart-details)
7. [Update/Remove Items](#updateremove-items)
8. [Frontend Requirements](#frontend-requirements)
9. [Breaking Changes](#breaking-changes)
10. [Migration Guide](#migration-guide)

---

## **Overview**

### **What Changed?**

The cart system now supports **multiple item types** (bikes and hostels) in a **single unified cart**.

### **Key Features:**

✅ **Single Cart per User**: One active cart contains all items  
✅ **Mixed Items**: Bikes and hostels can coexist  
✅ **Different Date Ranges**: Bikes (Nov 1-3) + Hostels (Nov 5-10) = One cart  
✅ **Separate Pricing**: `bikeSubtotal` + `hostelSubtotal` = `subtotal`  
✅ **No Data Loss**: Adding hostel won't remove bikes, and vice versa

---

## **Cart Structure**

### **New Schema**

```json
{
  "_id": "cart_id",
  "user": "user_id",
  "isActive": true,
  
  // Bike Items
  "bikeItems": [
    {
      "_id": "item_id",
      "bike": "bike_id",
      "quantity": 1,
      "kmOption": "unlimited",
      "pricePerUnit": 800,
      "totalPrice": 840,
      "addedAt": "2025-11-01T05:15:50.122Z"
    }
  ],
  
  // Bike Booking Dates
  "bikeDates": {
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2025-11-01T00:00:00.000Z",
    "startTime": "11:00",
    "endTime": "20:00"
  },
  
  // Hostel Items
  "hostelItems": [
    {
      "_id": "item_id",
      "hostel": "hostel_id",
      "roomType": "Bed in 10 Bed Mixed AC Dormitory Room",
      "mealOption": "bedAndBreakfast",
      "quantity": 1,
      "pricePerNight": 785.33,
      "numberOfNights": 2,
      "totalPrice": 1570.66,
      "isWorkstation": false,
      "addedAt": "2025-11-01T05:20:30.456Z"
    }
  ],
  
  // Hostel Booking Dates
  "hostelDates": {
    "checkIn": "2025-11-05T00:00:00.000Z",
    "checkOut": "2025-11-07T00:00:00.000Z"
  },
  
  // Unified Pricing
  "pricing": {
    "bikeSubtotal": 800,      // Bikes only
    "hostelSubtotal": 1570.66, // Hostels only
    "subtotal": 2370.66,       // Combined
    "gst": 118.53,
    "gstPercentage": 5,
    "total": 2489.19
  },
  
  // Helmet Details (for bikes)
  "helmetDetails": {
    "quantity": 1,
    "charges": 0,
    "message": "1 helmet(s) free (1 per bike)"
  },
  
  "expiresAt": "2025-11-01T06:15:50.207Z",
  "createdAt": "2025-11-01T05:15:50.091Z",
  "updatedAt": "2025-11-01T05:20:30.500Z"
}
```

---

## **API Endpoints**

| Method | Endpoint | Description | Changed? |
|--------|----------|-------------|----------|
| POST | `/api/cart/items` | Add bike to cart | ✅ Modified |
| POST | `/api/cart/hostels` | Add hostel to cart | 🆕 New |
| GET | `/api/cart/details` | Get complete cart | 🆕 New (Recommended) |
| GET | `/api/cart` | Get cart (old) | ⚠️ Use `details` instead |
| PUT | `/api/cart/items/:itemId` | Update bike quantity | ✅ Modified |
| DELETE | `/api/cart/items/:itemId` | Remove bike | ✅ Modified |
| DELETE | `/api/cart/hostels/:itemId` | Remove hostel | 🆕 New |
| PUT | `/api/cart/helmets` | Update helmet quantity | ✅ Modified |
| DELETE | `/api/cart` | Clear entire cart | ✅ Same |

---

## **Add Bike to Cart**

### **Endpoint**
```
POST /api/cart/items
```

### **Request Body**
```json
{
  "bikeId": "65e5a8a1fc13ae1234000103",
  "quantity": 1,
  "kmOption": "unlimited",
  "startDate": "2025-11-01",
  "endDate": "2025-11-01",
  "startTime": "11:00",
  "endTime": "20:00"
}
```

### **CURL Example**
```bash
curl -X POST 'http://localhost:8080/api/cart/items' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "bikeId": "65e5a8a1fc13ae1234000103",
    "quantity": 1,
    "kmOption": "unlimited",
    "startDate": "2025-11-01",
    "endDate": "2025-11-01",
    "startTime": "11:00",
    "endTime": "20:00"
  }'
```

### **Success Response (200)**
```json
{
  "success": true,
  "data": {
    "_id": "690597868c1f2096dc42d093",
    "user": "6863916556ee5c1482baffe8",
    "bikeItems": [
      {
        "bike": {
          "_id": "65e5a8a1fc13ae1234000103",
          "title": "Honda Activa 6G",
          "brand": "Honda",
          "model": "6G",
          "images": ["https://example.com/bike.jpg"],
          "pricePerDay": {
            "weekday": {
              "unlimited": { "isActive": true, "price": 600 }
            },
            "weekend": {
              "unlimited": { "isActive": true, "price": 800 }
            }
          }
        },
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 840,
        "_id": "690597868c1f2096dc42d095",
        "addedAt": "2025-11-01T05:15:50.122Z"
      }
    ],
    "hostelItems": [],
    "bikeDates": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-11-01T00:00:00.000Z",
      "startTime": "11:00",
      "endTime": "20:00"
    },
    "hostelDates": {},
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 0,
      "subtotal": 800,
      "bulkDiscount": { "amount": 0, "percentage": 0 },
      "extraCharges": 0,
      "gst": 40,
      "gstPercentage": 5,
      "total": 840
    },
    "helmetDetails": {
      "quantity": 1,
      "charges": 0,
      "message": "1 helmet(s) free (1 per bike)"
    },
    "isActive": true,
    "expiresAt": "2025-11-01T05:45:50.206Z",
    "createdAt": "2025-11-01T05:15:50.091Z",
    "updatedAt": "2025-11-01T05:15:50.207Z"
  },
  "message": "Added bike to cart. Added 1 helmet automatically.",
  "savings": null,
  "helmetAutoAdded": 1
}
```

### **Error Responses**

#### **Missing Fields (400)**
```json
{
  "success": false,
  "error": "Please provide all required fields"
}
```

#### **Invalid Date Range (400)**
```json
{
  "success": false,
  "error": "Invalid booking dates"
}
```

#### **Bike Not Found (404)**
```json
{
  "success": false,
  "error": "Bike not found"
}
```

#### **Not Available (400)**
```json
{
  "success": false,
  "error": "Only 2 bikes available for the selected period"
}
```

---

## **Add Hostel to Cart**

### **Endpoint**
```
POST /api/cart/hostels
```

### **Request Body**
```json
{
  "hostelId": "69042db1b1fbc11eb635315e",
  "roomType": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
  "mealOption": "bedAndBreakfast",
  "quantity": 1,
  "checkIn": "2025-11-05",
  "checkOut": "2025-11-07",
  "isWorkstation": false
}
```

### **CURL Example**
```bash
curl -X POST 'http://localhost:8080/api/cart/hostels' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "hostelId": "69042db1b1fbc11eb635315e",
    "roomType": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
    "mealOption": "bedAndBreakfast",
    "quantity": 1,
    "checkIn": "2025-11-05",
    "checkOut": "2025-11-07",
    "isWorkstation": false
  }'
```

### **Success Response (200)**
```json
{
  "success": true,
  "data": {
    "_id": "690597868c1f2096dc42d093",
    "user": "6863916556ee5c1482baffe8",
    "bikeItems": [
      {
        "bike": {
          "_id": "65e5a8a1fc13ae1234000103",
          "title": "Honda Activa 6G"
        },
        "quantity": 1,
        "totalPrice": 840
      }
    ],
    "hostelItems": [
      {
        "hostel": {
          "_id": "69042db1b1fbc11eb635315e",
          "name": "Zostel Chikkamagaluru",
          "location": "Chikkamagaluru, Karnataka",
          "images": ["https://example.com/hostel.jpg"],
          "ratings": { "average": 4.5, "count": 120 }
        },
        "roomType": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "mealOption": "bedAndBreakfast",
        "quantity": 1,
        "pricePerNight": 785.33,
        "numberOfNights": 2,
        "totalPrice": 1570.66,
        "isWorkstation": false,
        "_id": "690598f48c1f2096dc42d0a1",
        "addedAt": "2025-11-01T05:20:30.456Z"
      }
    ],
    "bikeDates": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-11-01T00:00:00.000Z",
      "startTime": "11:00",
      "endTime": "20:00"
    },
    "hostelDates": {
      "checkIn": "2025-11-05T00:00:00.000Z",
      "checkOut": "2025-11-07T00:00:00.000Z"
    },
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 1570.66,
      "subtotal": 2370.66,
      "gst": 118.53,
      "gstPercentage": 5,
      "total": 2489.19
    },
    "helmetDetails": {
      "quantity": 1,
      "charges": 0
    },
    "expiresAt": "2025-11-01T05:50:30.500Z",
    "updatedAt": "2025-11-01T05:20:30.500Z"
  },
  "message": "Added bed to cart"
}
```

### **Error Responses**

#### **Missing Fields (400)**
```json
{
  "success": false,
  "error": "Please provide all required fields"
}
```

#### **Invalid Meal Option (400)**
```json
{
  "success": false,
  "error": "Invalid meal option"
}
```

#### **Hostel Not Found (404)**
```json
{
  "success": false,
  "error": "Hostel not found"
}
```

#### **Room Not Available (400)**
```json
{
  "success": false,
  "error": "Only 3 beds available for the selected period"
}
```

#### **Not Workstation Friendly (400)**
```json
{
  "success": false,
  "error": "This room is not available for workstation stays"
}
```

---

## **Get Cart Details**

### **Endpoint**
```
GET /api/cart/details
```

### **CURL Example**
```bash
curl -X GET 'http://localhost:8080/api/cart/details' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### **Success Response (200) - Cart with Items**
```json
{
  "success": true,
  "data": {
    "_id": "690597868c1f2096dc42d093",
    "bikeItems": [
      {
        "bike": {
          "_id": "65e5a8a1fc13ae1234000103",
          "title": "Honda Activa 6G",
          "brand": "Honda",
          "model": "6G",
          "images": ["https://example.com/bike.jpg"],
          "pricePerDay": {
            "weekday": { "unlimited": { "price": 600 } },
            "weekend": { "unlimited": { "price": 800 } }
          }
        },
        "quantity": 1,
        "kmOption": "unlimited",
        "pricePerUnit": 800,
        "totalPrice": 840,
        "_id": "690597868c1f2096dc42d095"
      }
    ],
    "hostelItems": [
      {
        "hostel": {
          "_id": "69042db1b1fbc11eb635315e",
          "name": "Zostel Chikkamagaluru",
          "location": "Chikkamagaluru, Karnataka",
          "images": ["https://example.com/hostel.jpg"],
          "ratings": { "average": 4.5, "count": 120 },
          "rooms": [
            {
              "type": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
              "capacity": 10,
              "totalBeds": 10,
              "availableBeds": 8
            }
          ]
        },
        "roomType": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "mealOption": "bedAndBreakfast",
        "quantity": 1,
        "pricePerNight": 785.33,
        "numberOfNights": 2,
        "totalPrice": 1570.66,
        "isWorkstation": false,
        "_id": "690598f48c1f2096dc42d0a1",
        "roomDetails": {
          "type": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
          "capacity": 10,
          "totalBeds": 10,
          "availableBeds": 8,
          "amenities": ["AC", "Ensuite Bathroom", "Lockers"],
          "isWorkstationFriendly": false
        }
      }
    ],
    "bikeDates": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-11-01T00:00:00.000Z",
      "startTime": "11:00",
      "endTime": "20:00"
    },
    "hostelDates": {
      "checkIn": "2025-11-05T00:00:00.000Z",
      "checkOut": "2025-11-07T00:00:00.000Z"
    },
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 1570.66,
      "subtotal": 2370.66,
      "bulkDiscount": { "amount": 0, "percentage": 0 },
      "extraCharges": 0,
      "gst": 118.53,
      "gstPercentage": 5,
      "total": 2489.19
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
      "hostelSubtotal": 1570.66,
      "subtotal": 2370.66,
      "gst": 118.53,
      "total": 2489.19
    }
  }
}
```

### **Success Response (200) - Empty Cart**
```json
{
  "success": true,
  "data": {
    "bikeItems": [],
    "hostelItems": [],
    "bikeDates": {},
    "hostelDates": {},
    "pricing": {
      "bikeSubtotal": 0,
      "hostelSubtotal": 0,
      "subtotal": 0,
      "gst": 0,
      "total": 0
    },
    "isEmpty": true,
    "summary": {
      "totalBikes": 0,
      "totalBeds": 0,
      "bikeSubtotal": 0,
      "hostelSubtotal": 0,
      "subtotal": 0,
      "gst": 0,
      "total": 0
    }
  }
}
```

---

## **Update/Remove Items**

### **Update Bike Quantity**

```bash
# Update bike quantity
curl -X PUT 'http://localhost:8080/api/cart/items/{itemId}' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"quantity": 2}'
```

**Response**: Same structure as "Add Bike to Cart", with updated quantities and pricing.

---

### **Remove Bike from Cart**

```bash
# Remove bike
curl -X DELETE 'http://localhost:8080/api/cart/items/{itemId}' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    // Cart with bike removed, but hostels preserved
    "bikeItems": [],
    "hostelItems": [/* hostel items still here */],
    "pricing": {
      "bikeSubtotal": 0,
      "hostelSubtotal": 1570.66,
      "subtotal": 1570.66,
      "gst": 78.53,
      "total": 1649.19
    }
  },
  "message": "Item removed from cart"
}
```

---

### **Remove Hostel from Cart**

```bash
# Remove hostel
curl -X DELETE 'http://localhost:8080/api/cart/hostels/{itemId}' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    // Cart with hostel removed, but bikes preserved
    "bikeItems": [/* bike items still here */],
    "hostelItems": [],
    "pricing": {
      "bikeSubtotal": 800,
      "hostelSubtotal": 0,
      "subtotal": 800,
      "gst": 40,
      "total": 840
    }
  },
  "message": "Hostel removed from cart"
}
```

---

### **Update Helmet Quantity**

```bash
# Update helmet quantity (for bikes)
curl -X PUT 'http://localhost:8080/api/cart/helmets' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"quantity": 2}'
```

---

### **Clear Entire Cart**

```bash
# Clear everything
curl -X DELETE 'http://localhost:8080/api/cart' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

---

## **Frontend Requirements**

### **1. Cart Display**

#### **A. Show Both Item Types**

Your cart UI should display:
```
🛒 Your Cart (2 items)

🏍️ Bikes (Nov 1, 11:00 AM - Nov 1, 8:00 PM)
  └─ Honda Activa 6G x1          ₹840

🏨 Hostels (Nov 5 - Nov 7, 2 nights)
  └─ Zostel Chikkamagaluru x1    ₹1,649
     Room: Bed in 10 Bed Dorm
     Meal: Bed & Breakfast

───────────────────────────────────
Bike Subtotal:           ₹800
Hostel Subtotal:         ₹1,571
GST (5%):                ₹119
───────────────────────────────────
Total:                   ₹2,489
```

#### **B. Handle Different Date Ranges**

```jsx
// Example React Component Structure
<Cart>
  {cart.bikeItems.length > 0 && (
    <BikeSection>
      <DateRange>
        {formatDate(cart.bikeDates.startDate)} - {formatDate(cart.bikeDates.endDate)}
        <Time>{cart.bikeDates.startTime} - {cart.bikeDates.endTime}</Time>
      </DateRange>
      {cart.bikeItems.map(item => <BikeCartItem key={item._id} item={item} />)}
      <Subtotal>₹{cart.pricing.bikeSubtotal}</Subtotal>
    </BikeSection>
  )}
  
  {cart.hostelItems.length > 0 && (
    <HostelSection>
      <DateRange>
        {formatDate(cart.hostelDates.checkIn)} - {formatDate(cart.hostelDates.checkOut)}
        <Nights>{calculateNights(cart.hostelDates)} nights</Nights>
      </DateRange>
      {cart.hostelItems.map(item => <HostelCartItem key={item._id} item={item} />)}
      <Subtotal>₹{cart.pricing.hostelSubtotal}</Subtotal>
    </HostelSection>
  )}
  
  <PricingSummary>
    <Line>Subtotal: ₹{cart.pricing.subtotal}</Line>
    <Line>GST (5%): ₹{cart.pricing.gst}</Line>
    <Total>Total: ₹{cart.pricing.total}</Total>
  </PricingSummary>
</Cart>
```

---

### **2. Cart Badge/Counter**

```jsx
// Show total items across both types
const totalItems = cart.bikeItems.reduce((sum, item) => sum + item.quantity, 0) +
                   cart.hostelItems.reduce((sum, item) => sum + item.quantity, 0);

<CartIcon badge={totalItems} />
```

---

### **3. Empty State**

```jsx
if (cart.isEmpty || (!cart.bikeItems.length && !cart.hostelItems.length)) {
  return <EmptyCart message="Your cart is empty" />;
}
```

---

### **4. API Calls**

#### **Add Bike**
```javascript
const addBikeToCart = async (bikeId, quantity, kmOption, dates) => {
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bikeId,
      quantity,
      kmOption,
      startDate: dates.startDate,
      endDate: dates.endDate,
      startTime: dates.startTime,
      endTime: dates.endTime
    })
  });
  return response.json();
};
```

#### **Add Hostel**
```javascript
const addHostelToCart = async (hostelId, roomType, mealOption, quantity, dates) => {
  const response = await fetch('/api/cart/hostels', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      hostelId,
      roomType,
      mealOption,
      quantity,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      isWorkstation: dates.isWorkstation || false
    })
  });
  return response.json();
};
```

#### **Get Cart**
```javascript
const getCart = async () => {
  const response = await fetch('/api/cart/details', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

---

### **5. Checkout Flow**

You can now support **two checkout scenarios**:

#### **Scenario A: Separate Checkouts**
```
1. User clicks "Checkout Bikes" → Create bike booking(s)
2. User clicks "Checkout Hostels" → Create hostel booking(s)
```

#### **Scenario B: Unified Checkout** (Recommended)
```
1. User clicks "Proceed to Checkout"
2. Show summary of ALL items (bikes + hostels)
3. Single payment for everything
4. Backend creates separate bookings but one payment
```

---

### **6. Validation**

```javascript
// Check if cart has items before checkout
const canCheckout = () => {
  return cart.bikeItems.length > 0 || cart.hostelItems.length > 0;
};

// Show appropriate message
if (cart.bikeItems.length === 0) {
  message = "No bikes in cart. Add bikes to continue.";
}
if (cart.hostelItems.length === 0) {
  message = "No hostels in cart. Add hostels to continue.";
}
```

---

## **Breaking Changes**

### **⚠️ What Changed?**

| What | Before | After | Action Required |
|------|--------|-------|-----------------|
| **Cart Structure** | `items` array | `bikeItems` + `hostelItems` | Update code |
| **Pricing** | `subtotal`, `total` | `bikeSubtotal`, `hostelSubtotal`, `subtotal`, `total` | Update UI |
| **Dates** | `startDate`, `endDate`, `startTime`, `endTime` | `bikeDates` + `hostelDates` objects | Update date display |
| **Get Cart** | `GET /api/cart` | `GET /api/cart/details` (recommended) | Switch endpoint |
| **Empty Check** | `cart.items.length === 0` | `cart.isEmpty` or check both arrays | Update logic |

---

### **⚠️ Removed/Deprecated**

| Item | Status | Alternative |
|------|--------|-------------|
| `cart.items` | ❌ Removed | Use `cart.bikeItems` |
| `cart.startDate` (root level) | ❌ Removed | Use `cart.bikeDates.startDate` |
| `cart.endDate` (root level) | ❌ Removed | Use `cart.bikeDates.endDate` |
| `cart.startTime` (root level) | ❌ Removed | Use `cart.bikeDates.startTime` |
| `cart.endTime` (root level) | ❌ Removed | Use `cart.bikeDates.endTime` |
| `GET /api/cart?startDate=...` | ⚠️ Still works but deprecated | Use `GET /api/cart/details` |

---

## **Migration Guide**

### **Step 1: Update API Calls**

**Before:**
```javascript
// OLD - Don't use
fetch(`/api/cart?startDate=${start}&endDate=${end}&startTime=${sTime}&endTime=${eTime}`)
```

**After:**
```javascript
// NEW - Use this
fetch('/api/cart/details')
```

---

### **Step 2: Update Cart State**

**Before:**
```javascript
const [cart, setCart] = useState({
  items: [],
  pricing: { subtotal: 0, total: 0 }
});
```

**After:**
```javascript
const [cart, setCart] = useState({
  bikeItems: [],
  hostelItems: [],
  bikeDates: {},
  hostelDates: {},
  pricing: {
    bikeSubtotal: 0,
    hostelSubtotal: 0,
    subtotal: 0,
    gst: 0,
    total: 0
  },
  isEmpty: true
});
```

---

### **Step 3: Update Cart Display Logic**

**Before:**
```javascript
// OLD
{cart.items.map(item => (
  <CartItem key={item._id} item={item} />
))}
```

**After:**
```javascript
// NEW
{cart.bikeItems.length > 0 && (
  <div>
    <h3>Bikes</h3>
    <p>Dates: {formatBikeDates(cart.bikeDates)}</p>
    {cart.bikeItems.map(item => (
      <BikeCartItem key={item._id} item={item} />
    ))}
  </div>
)}

{cart.hostelItems.length > 0 && (
  <div>
    <h3>Hostels</h3>
    <p>Dates: {formatHostelDates(cart.hostelDates)}</p>
    {cart.hostelItems.map(item => (
      <HostelCartItem key={item._id} item={item} />
    ))}
  </div>
)}
```

---

### **Step 4: Update Empty Cart Check**

**Before:**
```javascript
// OLD
if (cart.items.length === 0) {
  return <EmptyCart />;
}
```

**After:**
```javascript
// NEW - Option 1 (Using flag)
if (cart.isEmpty) {
  return <EmptyCart />;
}

// NEW - Option 2 (Manual check)
if (cart.bikeItems.length === 0 && cart.hostelItems.length === 0) {
  return <EmptyCart />;
}
```

---

### **Step 5: Update Pricing Display**

**Before:**
```javascript
// OLD
<div>
  <p>Subtotal: ₹{cart.pricing.subtotal}</p>
  <p>GST: ₹{cart.pricing.gst}</p>
  <p>Total: ₹{cart.pricing.total}</p>
</div>
```

**After:**
```javascript
// NEW
<div>
  {cart.bikeItems.length > 0 && (
    <p>Bike Subtotal: ₹{cart.pricing.bikeSubtotal}</p>
  )}
  {cart.hostelItems.length > 0 && (
    <p>Hostel Subtotal: ₹{cart.pricing.hostelSubtotal}</p>
  )}
  <p>Subtotal: ₹{cart.pricing.subtotal}</p>
  <p>GST (5%): ₹{cart.pricing.gst}</p>
  <p><strong>Total: ₹{cart.pricing.total}</strong></p>
</div>
```

---

### **Step 6: Update Cart Badge**

**Before:**
```javascript
// OLD - Single type
const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
```

**After:**
```javascript
// NEW - Both types
const cartItemCount = 
  cart.bikeItems.reduce((sum, item) => sum + item.quantity, 0) +
  cart.hostelItems.reduce((sum, item) => sum + item.quantity, 0);

// OR use the summary
const cartItemCount = cart.summary?.totalBikes + cart.summary?.totalBeds || 0;
```

---

## **Testing Checklist**

### **Scenario 1: Bike Only**
- [ ] Add bike to empty cart
- [ ] Verify `bikeItems` populated, `hostelItems` empty
- [ ] Verify `bikeSubtotal` = `subtotal`
- [ ] Remove bike, verify cart empty

### **Scenario 2: Hostel Only**
- [ ] Add hostel to empty cart
- [ ] Verify `hostelItems` populated, `bikeItems` empty
- [ ] Verify `hostelSubtotal` = `subtotal`
- [ ] Remove hostel, verify cart empty

### **Scenario 3: Both Items**
- [ ] Add bike first, then hostel
- [ ] Verify BOTH arrays populated
- [ ] Verify `subtotal` = `bikeSubtotal` + `hostelSubtotal`
- [ ] Remove bike, verify hostel remains
- [ ] Add bike again, verify both present

### **Scenario 4: Different Date Ranges**
- [ ] Add bike (Nov 1-3)
- [ ] Add hostel (Nov 5-10)
- [ ] Verify different dates stored correctly
- [ ] Verify UI shows both date ranges

### **Scenario 5: Quantities**
- [ ] Add 2 bikes
- [ ] Add 3 hostel beds
- [ ] Verify quantities and pricing correct
- [ ] Update bike quantity to 1
- [ ] Verify hostel quantity unchanged

---

## **FAQ**

### **Q1: Can I book bikes and hostels for the same dates?**
**A:** Yes! The cart supports any date combination:
- Same dates: Nov 1-3 for both
- Different dates: Bike Nov 1-3, Hostel Nov 5-10
- Overlapping: Bike Nov 1-5, Hostel Nov 3-8

### **Q2: What happens if I add a bike after adding a hostel?**
**A:** The bike is added to the same cart. Nothing is removed. Both coexist.

### **Q3: Can I checkout only bikes or only hostels?**
**A:** Yes! You can implement:
- Separate checkout buttons for each type
- Or a unified checkout for everything

### **Q4: What if I remove all bikes but have hostels?**
**A:** The cart remains active with only hostels. `bikeSubtotal` becomes 0, but `hostelSubtotal` and cart remain.

### **Q5: Does helmet quantity affect hostel pricing?**
**A:** No. Helmets are for bikes only and don't affect hostel pricing.

### **Q6: Can I have multiple carts?**
**A:** No. One active cart per user. Adding items to the cart updates the single active cart.

---

## **Support**

For issues or questions:
1. Check this documentation
2. Review API responses for error messages
3. Contact backend team with:
   - API endpoint called
   - Request payload
   - Response received
   - Expected behavior

---

**Last Updated:** November 1, 2025  
**Version:** 2.0.0  
**Status:** ✅ Production Ready

