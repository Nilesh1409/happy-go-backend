# 🏨 Hostel Create & Update cURL Examples

Complete cURL commands with sample data for creating and updating hostels.

---

## 📝 Create New Hostel

### Endpoint: `POST /api/hostels`

### Full Example with All Fields

```bash
curl -X POST "http://localhost:8080/api/hostels" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mountain Paradise Hostel",
    "description": "A beautiful hostel nestled in the mountains of Chikkamagaluru, perfect for nature lovers and digital nomads. Features stunning views, modern amenities, and a peaceful environment ideal for work and relaxation.",
    "location": "Chikkamagaluru",
    "address": "Near Mullayanagiri Peak, Chikkamagaluru, Karnataka 577101",
    "images": [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"
    ],
    "amenities": [
      {
        "name": "High-Speed WiFi",
        "icon": "wifi",
        "description": "100 Mbps fiber connection throughout the property"
      },
      {
        "name": "Free Parking",
        "icon": "parking",
        "description": "Secure parking for cars and bikes"
      },
      {
        "name": "Common Kitchen",
        "icon": "kitchen",
        "description": "Fully equipped kitchen with cooking essentials"
      },
      {
        "name": "Laundry Service",
        "icon": "washing-machine",
        "description": "Self-service washing machines available"
      },
      {
        "name": "24/7 Security",
        "icon": "shield",
        "description": "CCTV surveillance and security staff"
      },
      {
        "name": "Hot Water",
        "icon": "water-heater",
        "description": "24/7 hot water availability"
      }
    ],
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory",
        "description": "Comfortable 6-bed dormitory with ample space, great for solo travelers. Features modern amenities and a quiet atmosphere.",
        "images": [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
          "https://images.unsplash.com/photo-1631049035324-0f6f82a6e35e?w=800"
        ],
        "capacity": 6,
        "totalBeds": 12,
        "availableBeds": 12,
        "amenities": [
          "Air Conditioning",
          "Individual Lockers",
          "Reading Lights",
          "Power Outlets",
          "Ensuite Bathroom",
          "Privacy Curtains"
        ],
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
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        }
      },
      {
        "type": "Private AC Room",
        "description": "Cozy private room with comfortable double bed, perfect for couples or solo travelers seeking privacy.",
        "images": [
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"
        ],
        "capacity": 2,
        "totalBeds": 4,
        "availableBeds": 4,
        "amenities": [
          "Air Conditioning",
          "Double Bed",
          "Wardrobe",
          "Work Desk",
          "Ensuite Bathroom",
          "TV",
          "Mini Fridge"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 1500,
            "discountedPrice": 1400
          },
          "bedAndBreakfast": {
            "basePrice": 1800,
            "discountedPrice": 1700
          },
          "bedBreakfastAndDinner": {
            "basePrice": 2200,
            "discountedPrice": 2100
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        }
      },
      {
        "type": "Deluxe Private Room with Balcony",
        "description": "Premium room with expansive balcony offering panoramic mountain views. Perfect for long-term stays.",
        "images": [
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
        ],
        "capacity": 2,
        "totalBeds": 3,
        "availableBeds": 3,
        "amenities": [
          "Air Conditioning",
          "King Size Bed",
          "Work Desk",
          "Ergonomic Chair",
          "Ensuite Bathroom",
          "Smart TV",
          "Mini Fridge",
          "Private Balcony",
          "Mountain View"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 2500,
            "discountedPrice": 2400
          },
          "bedAndBreakfast": {
            "basePrice": 2800,
            "discountedPrice": 2700
          },
          "bedBreakfastAndDinner": {
            "basePrice": 3200,
            "discountedPrice": 3100
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        }
      }
    ],
    "guidelines": [
      "Check-in starts at 1:00 PM",
      "Check-out before 10:00 AM",
      "Valid ID proof required at check-in",
      "Advance booking recommended during peak season"
    ],
    "checkInGuidelines": [
      "Reception open 24/7",
      "Early check-in subject to availability",
      "Valid government-issued ID required",
      "Luggage storage available for early arrivals"
    ],
    "cancellationPolicies": [
      "Free cancellation up to 48 hours before check-in",
      "50% refund for cancellations made 24-48 hours before check-in",
      "No refund for cancellations within 24 hours of check-in"
    ],
    "houseRules": [
      "Quiet hours: 10 PM - 8 AM",
      "No smoking inside rooms or dormitories",
      "Guests are responsible for their belongings",
      "Respect common spaces and keep them clean"
    ],
    "ratings": 4.5,
    "numReviews": 0,
    "isActive": true,
    "checkInTime": "1:00 PM",
    "checkOutTime": "10:00 AM",
    "contactInfo": {
      "phone": "+91-9876543210",
      "email": "info@mountainparadise.com",
      "whatsapp": "+91-9876543210"
    },
    "supportsWorkstation": true,
    "workstationAmenities": [
      "100 Mbps High-Speed WiFi",
      "Dedicated Co-working Space",
      "Meeting Rooms",
      "Printing & Scanning Facility",
      "24/7 Power Backup"
    ]
  }'
```

### Expected Success Response (201):

```json
{
  "success": true,
  "message": "Hostel created successfully",
  "data": {
    "_id": "67890abcdef12345",
    "name": "Mountain Paradise Hostel",
    "description": "A beautiful hostel nestled in the mountains...",
    "location": "Chikkamagaluru",
    "address": "Near Mullayanagiri Peak, Chikkamagaluru, Karnataka 577101",
    "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"],
    "amenities": [
      {
        "name": "High-Speed WiFi",
        "icon": "wifi",
        "description": "100 Mbps fiber connection throughout the property",
        "_id": "amenity123"
      }
    ],
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory",
        "capacity": 6,
        "totalBeds": 12,
        "availableBeds": 12,
        "mealOptions": {
          "bedOnly": {
            "basePrice": 500,
            "discountedPrice": 450
          }
        },
        "_id": "room123"
      }
    ],
    "isActive": true,
    "supportsWorkstation": true,
    "ratings": 4.5,
    "numReviews": 0,
    "checkInTime": "1:00 PM",
    "checkOutTime": "10:00 AM",
    "createdAt": "2025-01-26T10:00:00.000Z",
    "updatedAt": "2025-01-26T10:00:00.000Z",
    "__v": 0
  }
}
```

---

## 🔄 Update Existing Hostel

### Endpoint: `PUT /api/hostels/:id`

### Example 1: Update All Fields

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mountain Paradise Hostel - Updated",
    "description": "Updated description with new amenities and services for 2025. Offering premium accommodation with stunning mountain views.",
    "location": "Chikkamagaluru",
    "address": "Near Mullayanagiri Peak, Chikkamagaluru, Karnataka 577101",
    "images": [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800"
    ],
    "amenities": [
      {
        "name": "Ultra-Fast WiFi",
        "icon": "wifi",
        "description": "200 Mbps fiber connection throughout the property"
      },
      {
        "name": "Free Parking",
        "icon": "parking",
        "description": "Secure parking for cars and bikes"
      },
      {
        "name": "Common Kitchen",
        "icon": "kitchen",
        "description": "Fully equipped kitchen with cooking essentials"
      },
      {
        "name": "Laundry Service",
        "icon": "washing-machine",
        "description": "Self-service washing machines available"
      },
      {
        "name": "24/7 Security",
        "icon": "shield",
        "description": "CCTV surveillance and security staff"
      },
      {
        "name": "Gym",
        "icon": "dumbbell",
        "description": "Fully equipped fitness center"
      },
      {
        "name": "Yoga Studio",
        "icon": "yoga",
        "description": "Daily yoga sessions available"
      }
    ],
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory",
        "description": "Comfortable 6-bed dormitory with updated amenities and modern decor.",
        "images": [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
          "https://images.unsplash.com/photo-1631049035324-0f6f82a6e35e?w=800"
        ],
        "capacity": 6,
        "totalBeds": 12,
        "availableBeds": 10,
        "amenities": [
          "Air Conditioning",
          "Individual Lockers",
          "Reading Lights",
          "Power Outlets",
          "Ensuite Bathroom",
          "Privacy Curtains",
          "USB Charging Ports"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 550,
            "discountedPrice": 500
          },
          "bedAndBreakfast": {
            "basePrice": 700,
            "discountedPrice": 650
          },
          "bedBreakfastAndDinner": {
            "basePrice": 900,
            "discountedPrice": 850
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        }
      },
      {
        "type": "Private AC Room",
        "description": "Upgraded private room with enhanced amenities and modern furnishings.",
        "images": [
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800"
        ],
        "capacity": 2,
        "totalBeds": 4,
        "availableBeds": 3,
        "amenities": [
          "Air Conditioning",
          "Queen Size Bed",
          "Wardrobe",
          "Work Desk",
          "Ensuite Bathroom",
          "Smart TV",
          "Mini Fridge",
          "Tea/Coffee Maker"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 1600,
            "discountedPrice": 1500
          },
          "bedAndBreakfast": {
            "basePrice": 1900,
            "discountedPrice": 1800
          },
          "bedBreakfastAndDinner": {
            "basePrice": 2300,
            "discountedPrice": 2200
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        }
      },
      {
        "type": "Deluxe Private Room with Balcony",
        "description": "Premium room with panoramic views and luxury amenities for the ultimate comfort.",
        "images": [
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"
        ],
        "capacity": 2,
        "totalBeds": 3,
        "availableBeds": 2,
        "amenities": [
          "Air Conditioning",
          "King Size Bed",
          "Executive Work Desk",
          "Ergonomic Chair",
          "Ensuite Bathroom",
          "Smart TV",
          "Mini Fridge",
          "Tea/Coffee Maker",
          "Private Balcony",
          "Mountain View",
          "Premium Bedding",
          "Sofa"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 2600,
            "discountedPrice": 2500
          },
          "bedAndBreakfast": {
            "basePrice": 2900,
            "discountedPrice": 2800
          },
          "bedBreakfastAndDinner": {
            "basePrice": 3300,
            "discountedPrice": 3200
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        }
      },
      {
        "type": "Budget Dormitory",
        "description": "New budget-friendly option for backpackers and budget travelers.",
        "images": [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"
        ],
        "capacity": 8,
        "totalBeds": 8,
        "availableBeds": 8,
        "amenities": [
          "Fan",
          "Individual Lockers",
          "Shared Bathroom",
          "Reading Lights"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 350,
            "discountedPrice": 300
          },
          "bedAndBreakfast": {
            "basePrice": 500,
            "discountedPrice": 450
          },
          "bedBreakfastAndDinner": {
            "basePrice": 700,
            "discountedPrice": 650
          }
        },
        "isWorkstationFriendly": false
      }
    ],
    "guidelines": [
      "Check-in starts at 1:00 PM",
      "Check-out before 10:00 AM",
      "Valid ID proof required at check-in",
      "Advance booking recommended during peak season",
      "Pets not allowed"
    ],
    "checkInGuidelines": [
      "Reception open 24/7",
      "Early check-in subject to availability (charges may apply)",
      "Valid government-issued ID required",
      "Luggage storage available",
      "Self check-in kiosks available"
    ],
    "cancellationPolicies": [
      "Free cancellation up to 48 hours before check-in",
      "50% refund for cancellations made 24-48 hours before check-in",
      "No refund for cancellations within 24 hours of check-in",
      "No-shows will be charged the full amount"
    ],
    "houseRules": [
      "Quiet hours: 10 PM - 8 AM",
      "No smoking inside rooms or dormitories",
      "Guests are responsible for their belongings",
      "Respect common spaces and keep them clean",
      "Maximum 2 guests per private room",
      "Alcohol consumption only in designated areas"
    ],
    "ratings": 4.7,
    "numReviews": 156,
    "isActive": true,
    "checkInTime": "1:00 PM",
    "checkOutTime": "10:00 AM",
    "contactInfo": {
      "phone": "+91-9876543210",
      "email": "info@mountainparadise.com",
      "whatsapp": "+91-9876543210"
    },
    "supportsWorkstation": true,
    "workstationAmenities": [
      "200 Mbps High-Speed WiFi",
      "Dedicated Co-working Space",
      "Meeting Rooms",
      "Printing & Scanning Facility",
      "Whiteboard",
      "24/7 Power Backup",
      "Coffee/Tea in Co-working Area"
    ]
  }'
```

### Expected Success Response (200):

```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abcdef12345",
    "name": "Mountain Paradise Hostel - Updated",
    "description": "Updated description with new amenities...",
    "location": "Chikkamagaluru",
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory",
        "totalBeds": 12,
        "availableBeds": 10,
        "mealOptions": {
          "bedOnly": {
            "basePrice": 550,
            "discountedPrice": 500
          }
        }
      }
    ],
    "ratings": 4.7,
    "numReviews": 156,
    "isActive": true,
    "createdAt": "2025-01-26T10:00:00.000Z",
    "updatedAt": "2025-01-26T15:30:00.000Z",
    "__v": 1
  }
}
```

---

## 📝 Partial Update Examples

### Example 2: Update Only Name and Description

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mountain Paradise Retreat",
    "description": "Updated description highlighting our new facilities and services"
  }'
```

---

### Example 3: Update Only Pricing

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory",
        "description": "Comfortable 6-bed dormitory",
        "images": ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"],
        "capacity": 6,
        "totalBeds": 12,
        "availableBeds": 12,
        "amenities": ["Air Conditioning", "Lockers"],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 600,
            "discountedPrice": 550
          },
          "bedAndBreakfast": {
            "basePrice": 750,
            "discountedPrice": 700
          },
          "bedBreakfastAndDinner": {
            "basePrice": 950,
            "discountedPrice": 900
          }
        },
        "isWorkstationFriendly": true
      }
    ]
  }'
```

---

### Example 4: Update Contact Information Only

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactInfo": {
      "phone": "+91-9999888877",
      "email": "newemail@mountainparadise.com",
      "whatsapp": "+91-9999888877"
    }
  }'
```

---

### Example 5: Add New Amenities

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amenities": [
      {
        "name": "Swimming Pool",
        "icon": "pool",
        "description": "Outdoor swimming pool with mountain views"
      },
      {
        "name": "Spa",
        "icon": "spa",
        "description": "Relaxing spa services available"
      },
      {
        "name": "Restaurant",
        "icon": "restaurant",
        "description": "On-site restaurant serving local and international cuisine"
      }
    ]
  }'
```

---

### Example 6: Update Images Only

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
      "https://images.unsplash.com/photo-1631049035324-0f6f82a6e35e?w=800"
    ]
  }'
```

---

### Example 7: Update Check-in/Check-out Times

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInTime": "2:00 PM",
    "checkOutTime": "11:00 AM"
  }'
```

---

### Example 8: Deactivate Hostel

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

---

### Example 9: Activate Hostel

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": true
  }'
```

---

### Example 10: Add New Room Type

```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abcdef12345" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Family Suite",
        "description": "Spacious family suite with two bedrooms, perfect for families with children",
        "images": [
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"
        ],
        "capacity": 4,
        "totalBeds": 2,
        "availableBeds": 2,
        "amenities": [
          "Air Conditioning",
          "Two Bedrooms",
          "Living Area",
          "Kitchenette",
          "Two Bathrooms",
          "TV",
          "Mini Fridge",
          "Balcony"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 3500,
            "discountedPrice": 3300
          },
          "bedAndBreakfast": {
            "basePrice": 4000,
            "discountedPrice": 3800
          },
          "bedBreakfastAndDinner": {
            "basePrice": 4800,
            "discountedPrice": 4600
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": false
        }
      }
    ]
  }'
```

---

## 🔑 Important Notes

### For CREATE (POST):
- ✅ All required fields must be provided
- ✅ `availableBeds` will automatically be set to `totalBeds` if not specified
- ✅ At least one room must be provided
- ✅ At least one image is required for hostel
- ✅ At least one image is required for each room

### For UPDATE (PUT):
- ✅ Only send fields you want to update
- ✅ When updating rooms, send the complete room array (all rooms)
- ✅ Room IDs (`_id`) can be included to update existing rooms
- ✅ Omitting room `_id` will create new rooms

### Required Fields (for rooms):
- `type` (any string)
- `description`
- `images` (at least one)
- `capacity` (minimum 1)
- `totalBeds` (minimum 1)
- `availableBeds` (minimum 0)
- `mealOptions.bedOnly.basePrice`
- `mealOptions.bedAndBreakfast.basePrice`
- `mealOptions.bedBreakfastAndDinner.basePrice`

### Required Fields (for hostel):
- `name` (max 100 characters)
- `description`
- `location`
- `address`
- `images` (at least one)

---

## 🚨 Common Errors

### Error 1: Missing Required Field
```json
{
  "success": false,
  "error": "Hostel validation failed: name: Please add a name"
}
```

### Error 2: Invalid Capacity
```json
{
  "success": false,
  "error": "Hostel validation failed: rooms.0.capacity: Capacity must be at least 1"
}
```

### Error 3: Missing Meal Options
```json
{
  "success": false,
  "error": "Hostel validation failed: rooms.0.mealOptions.bedOnly.basePrice: Please add bed only base price"
}
```

### Error 4: Unauthorized
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

### Error 5: Hostel Not Found (Update only)
```json
{
  "success": false,
  "error": "Hostel not found"
}
```

---

## 📞 Support

Replace `YOUR_ADMIN_TOKEN` with your actual admin authentication token.

**Base URL:** `http://localhost:8080` (Development)

---

**Last Updated:** January 26, 2025
**Version:** 2.0

