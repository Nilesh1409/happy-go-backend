# 🏨 Hostel Update API - Complete Documentation

Complete documentation for the Hostel Update API with all possible request formats, success responses, and error scenarios.

---

## 📋 API Overview

**Endpoint:** `PUT /api/hostels/:id`

**Access:** Admin or Employee with Hostel Module Access

**Authentication:** Bearer Token Required

**Content-Type:** `application/json`

**Method:** `PUT`

---

## 🔑 Complete Request Format

### Full Request Body (All Fields)

```json
{
  "name": "Mountain Paradise Hostel",
  "description": "A beautiful hostel nestled in the mountains of Chikkamagaluru, perfect for nature lovers and digital nomads. Features stunning views, modern amenities, and a peaceful environment.",
  "location": "Chikkamagaluru",
  "address": "Near Mullayanagiri Peak, Chikkamagaluru, Karnataka 577101",
  "images": [
    "https://s3.amazonaws.com/happygo/hostels/main-building.jpg",
    "https://s3.amazonaws.com/happygo/hostels/common-area.jpg",
    "https://s3.amazonaws.com/happygo/hostels/view.jpg",
    "https://s3.amazonaws.com/happygo/hostels/kitchen.jpg"
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
    },
    {
      "name": "Common Lounge",
      "icon": "couch",
      "description": "Comfortable common area with TV and games"
    },
    {
      "name": "Terrace Access",
      "icon": "stairs",
      "description": "Rooftop terrace with mountain views"
    }
  ],
  "rooms": [
    {
      "type": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
      "description": "Spacious dormitory with 10 comfortable bunk beds, individual reading lights, power outlets, and personal lockers. Perfect for budget travelers.",
      "images": [
        "https://s3.amazonaws.com/happygo/rooms/10-bed-dorm-1.jpg",
        "https://s3.amazonaws.com/happygo/rooms/10-bed-dorm-2.jpg",
        "https://s3.amazonaws.com/happygo/rooms/10-bed-bathroom.jpg"
      ],
      "capacity": 10,
      "totalBeds": 20,
      "availableBeds": 15,
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
          "basePrice": 400,
          "discountedPrice": 350
        },
        "bedAndBreakfast": {
          "basePrice": 550,
          "discountedPrice": 500
        },
        "bedBreakfastAndDinner": {
          "basePrice": 750,
          "discountedPrice": 700
        }
      },
      "isWorkstationFriendly": false
    },
    {
      "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
      "description": "Comfortable 6-bed dormitory with ample space, great for solo travelers. Features modern amenities and a quiet atmosphere.",
      "images": [
        "https://s3.amazonaws.com/happygo/rooms/6-bed-dorm-1.jpg",
        "https://s3.amazonaws.com/happygo/rooms/6-bed-dorm-2.jpg"
      ],
      "capacity": 6,
      "totalBeds": 12,
      "availableBeds": 8,
      "amenities": [
        "Air Conditioning",
        "Individual Lockers",
        "Reading Lights",
        "Power Outlets",
        "Ensuite Bathroom",
        "Privacy Curtains",
        "USB Charging Ports",
        "Window with View"
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
      "type": "Bed in 4 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
      "description": "Premium 4-bed dormitory with spacious layout, perfect for digital nomads and remote workers. Includes dedicated workspace areas.",
      "images": [
        "https://s3.amazonaws.com/happygo/rooms/4-bed-dorm-1.jpg",
        "https://s3.amazonaws.com/happygo/rooms/4-bed-dorm-2.jpg",
        "https://s3.amazonaws.com/happygo/rooms/4-bed-workspace.jpg"
      ],
      "capacity": 4,
      "totalBeds": 8,
      "availableBeds": 6,
      "amenities": [
        "Air Conditioning",
        "Individual Lockers",
        "Reading Lights",
        "Multiple Power Outlets",
        "Ensuite Bathroom",
        "Privacy Curtains",
        "USB Charging Ports",
        "Work Desk",
        "Ergonomic Chair",
        "Large Window"
      ],
      "mealOptions": {
        "bedOnly": {
          "basePrice": 700,
          "discountedPrice": 650
        },
        "bedAndBreakfast": {
          "basePrice": 850,
          "discountedPrice": 800
        },
        "bedBreakfastAndDinner": {
          "basePrice": 1050,
          "discountedPrice": 1000
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
      "type": "Private AC Room with Ensuite Bathroom",
      "description": "Cozy private room with comfortable double bed, perfect for couples or solo travelers seeking privacy. Includes all modern amenities.",
      "images": [
        "https://s3.amazonaws.com/happygo/rooms/private-room-1.jpg",
        "https://s3.amazonaws.com/happygo/rooms/private-room-2.jpg",
        "https://s3.amazonaws.com/happygo/rooms/private-bathroom.jpg"
      ],
      "capacity": 2,
      "totalBeds": 2,
      "availableBeds": 2,
      "amenities": [
        "Air Conditioning",
        "Double Bed",
        "Wardrobe",
        "Work Desk",
        "Chair",
        "Ensuite Bathroom",
        "Hot Water",
        "TV",
        "Mini Fridge",
        "Tea/Coffee Maker",
        "Balcony"
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
      "type": "Deluxe Private AC Room with Ensuite Bathroom",
      "description": "Spacious deluxe room with premium furnishings and stunning views. Ideal for extended stays and remote work.",
      "images": [
        "https://s3.amazonaws.com/happygo/rooms/deluxe-room-1.jpg",
        "https://s3.amazonaws.com/happygo/rooms/deluxe-room-2.jpg",
        "https://s3.amazonaws.com/happygo/rooms/deluxe-view.jpg"
      ],
      "capacity": 2,
      "totalBeds": 2,
      "availableBeds": 2,
      "amenities": [
        "Air Conditioning",
        "King Size Bed",
        "Large Wardrobe",
        "Executive Work Desk",
        "Ergonomic Chair",
        "Ensuite Bathroom",
        "Hot Water",
        "Smart TV",
        "Mini Fridge",
        "Tea/Coffee Maker",
        "Kettle",
        "Balcony with Seating",
        "Premium Bedding",
        "Extra Storage"
      ],
      "mealOptions": {
        "bedOnly": {
          "basePrice": 2000,
          "discountedPrice": 1900
        },
        "bedAndBreakfast": {
          "basePrice": 2300,
          "discountedPrice": 2200
        },
        "bedBreakfastAndDinner": {
          "basePrice": 2700,
          "discountedPrice": 2600
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
      "type": "Deluxe Private AC Room with Balcony and Ensuite Bathroom",
      "description": "Premium room with expansive balcony offering panoramic mountain views. Perfect for long-term stays and digital nomads.",
      "images": [
        "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-1.jpg",
        "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-view.jpg",
        "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-workspace.jpg",
        "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-bathroom.jpg"
      ],
      "capacity": 2,
      "totalBeds": 2,
      "availableBeds": 1,
      "amenities": [
        "Air Conditioning",
        "King Size Bed",
        "Large Wardrobe",
        "Executive Work Desk",
        "Ergonomic Chair",
        "Ensuite Bathroom",
        "Hot Water",
        "Smart TV",
        "Mini Fridge",
        "Tea/Coffee Maker",
        "Kettle",
        "Large Balcony with Seating",
        "Mountain View",
        "Premium Bedding",
        "Extra Storage",
        "Sofa",
        "Reading Corner"
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
    "Advance booking recommended during peak season",
    "Pets not allowed",
    "Smoking only in designated areas"
  ],
  "checkInGuidelines": [
    "Reception open 24/7",
    "Early check-in subject to availability (additional charges may apply)",
    "Valid government-issued ID required",
    "Self check-in kiosks available",
    "Luggage storage available for early arrivals"
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
    "No outside guests allowed without prior approval",
    "Alcohol consumption only in designated areas",
    "Maximum 2 guests per private room"
  ],
  "ratings": 4.5,
  "numReviews": 342,
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
    "Whiteboard",
    "Projector",
    "24/7 Power Backup",
    "Coffee/Tea Maker in Co-working Area",
    "Ergonomic Seating"
  ]
}
```

---

## ✅ Success Response (200 OK)

### Complete Success Response with All Fields

```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abcdef12345",
    "name": "Mountain Paradise Hostel",
    "description": "A beautiful hostel nestled in the mountains of Chikkamagaluru, perfect for nature lovers and digital nomads. Features stunning views, modern amenities, and a peaceful environment.",
    "location": "Chikkamagaluru",
    "address": "Near Mullayanagiri Peak, Chikkamagaluru, Karnataka 577101",
    "images": [
      "https://s3.amazonaws.com/happygo/hostels/main-building.jpg",
      "https://s3.amazonaws.com/happygo/hostels/common-area.jpg",
      "https://s3.amazonaws.com/happygo/hostels/view.jpg",
      "https://s3.amazonaws.com/happygo/hostels/kitchen.jpg"
    ],
    "amenities": [
      {
        "name": "High-Speed WiFi",
        "icon": "wifi",
        "description": "100 Mbps fiber connection throughout the property",
        "_id": "67890amenity1"
      },
      {
        "name": "Free Parking",
        "icon": "parking",
        "description": "Secure parking for cars and bikes",
        "_id": "67890amenity2"
      },
      {
        "name": "Common Kitchen",
        "icon": "kitchen",
        "description": "Fully equipped kitchen with cooking essentials",
        "_id": "67890amenity3"
      },
      {
        "name": "Laundry Service",
        "icon": "washing-machine",
        "description": "Self-service washing machines available",
        "_id": "67890amenity4"
      },
      {
        "name": "24/7 Security",
        "icon": "shield",
        "description": "CCTV surveillance and security staff",
        "_id": "67890amenity5"
      },
      {
        "name": "Hot Water",
        "icon": "water-heater",
        "description": "24/7 hot water availability",
        "_id": "67890amenity6"
      },
      {
        "name": "Common Lounge",
        "icon": "couch",
        "description": "Comfortable common area with TV and games",
        "_id": "67890amenity7"
      },
      {
        "name": "Terrace Access",
        "icon": "stairs",
        "description": "Rooftop terrace with mountain views",
        "_id": "67890amenity8"
      }
    ],
    "rooms": [
      {
        "type": "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "description": "Spacious dormitory with 10 comfortable bunk beds, individual reading lights, power outlets, and personal lockers. Perfect for budget travelers.",
        "images": [
          "https://s3.amazonaws.com/happygo/rooms/10-bed-dorm-1.jpg",
          "https://s3.amazonaws.com/happygo/rooms/10-bed-dorm-2.jpg",
          "https://s3.amazonaws.com/happygo/rooms/10-bed-bathroom.jpg"
        ],
        "capacity": 10,
        "totalBeds": 20,
        "availableBeds": 15,
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
            "basePrice": 400,
            "discountedPrice": 350
          },
          "bedAndBreakfast": {
            "basePrice": 550,
            "discountedPrice": 500
          },
          "bedBreakfastAndDinner": {
            "basePrice": 750,
            "discountedPrice": 700
          }
        },
        "isWorkstationFriendly": false,
        "_id": "67890room1"
      },
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "description": "Comfortable 6-bed dormitory with ample space, great for solo travelers. Features modern amenities and a quiet atmosphere.",
        "images": [
          "https://s3.amazonaws.com/happygo/rooms/6-bed-dorm-1.jpg",
          "https://s3.amazonaws.com/happygo/rooms/6-bed-dorm-2.jpg"
        ],
        "capacity": 6,
        "totalBeds": 12,
        "availableBeds": 8,
        "amenities": [
          "Air Conditioning",
          "Individual Lockers",
          "Reading Lights",
          "Power Outlets",
          "Ensuite Bathroom",
          "Privacy Curtains",
          "USB Charging Ports",
          "Window with View"
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
        },
        "_id": "67890room2"
      },
      {
        "type": "Bed in 4 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "description": "Premium 4-bed dormitory with spacious layout, perfect for digital nomads and remote workers. Includes dedicated workspace areas.",
        "images": [
          "https://s3.amazonaws.com/happygo/rooms/4-bed-dorm-1.jpg",
          "https://s3.amazonaws.com/happygo/rooms/4-bed-dorm-2.jpg",
          "https://s3.amazonaws.com/happygo/rooms/4-bed-workspace.jpg"
        ],
        "capacity": 4,
        "totalBeds": 8,
        "availableBeds": 6,
        "amenities": [
          "Air Conditioning",
          "Individual Lockers",
          "Reading Lights",
          "Multiple Power Outlets",
          "Ensuite Bathroom",
          "Privacy Curtains",
          "USB Charging Ports",
          "Work Desk",
          "Ergonomic Chair",
          "Large Window"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 700,
            "discountedPrice": 650
          },
          "bedAndBreakfast": {
            "basePrice": 850,
            "discountedPrice": 800
          },
          "bedBreakfastAndDinner": {
            "basePrice": 1050,
            "discountedPrice": 1000
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        },
        "_id": "67890room3"
      },
      {
        "type": "Private AC Room with Ensuite Bathroom",
        "description": "Cozy private room with comfortable double bed, perfect for couples or solo travelers seeking privacy. Includes all modern amenities.",
        "images": [
          "https://s3.amazonaws.com/happygo/rooms/private-room-1.jpg",
          "https://s3.amazonaws.com/happygo/rooms/private-room-2.jpg",
          "https://s3.amazonaws.com/happygo/rooms/private-bathroom.jpg"
        ],
        "capacity": 2,
        "totalBeds": 2,
        "availableBeds": 2,
        "amenities": [
          "Air Conditioning",
          "Double Bed",
          "Wardrobe",
          "Work Desk",
          "Chair",
          "Ensuite Bathroom",
          "Hot Water",
          "TV",
          "Mini Fridge",
          "Tea/Coffee Maker",
          "Balcony"
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
        },
        "_id": "67890room4"
      },
      {
        "type": "Deluxe Private AC Room with Ensuite Bathroom",
        "description": "Spacious deluxe room with premium furnishings and stunning views. Ideal for extended stays and remote work.",
        "images": [
          "https://s3.amazonaws.com/happygo/rooms/deluxe-room-1.jpg",
          "https://s3.amazonaws.com/happygo/rooms/deluxe-room-2.jpg",
          "https://s3.amazonaws.com/happygo/rooms/deluxe-view.jpg"
        ],
        "capacity": 2,
        "totalBeds": 2,
        "availableBeds": 2,
        "amenities": [
          "Air Conditioning",
          "King Size Bed",
          "Large Wardrobe",
          "Executive Work Desk",
          "Ergonomic Chair",
          "Ensuite Bathroom",
          "Hot Water",
          "Smart TV",
          "Mini Fridge",
          "Tea/Coffee Maker",
          "Kettle",
          "Balcony with Seating",
          "Premium Bedding",
          "Extra Storage"
        ],
        "mealOptions": {
          "bedOnly": {
            "basePrice": 2000,
            "discountedPrice": 1900
          },
          "bedAndBreakfast": {
            "basePrice": 2300,
            "discountedPrice": 2200
          },
          "bedBreakfastAndDinner": {
            "basePrice": 2700,
            "discountedPrice": 2600
          }
        },
        "isWorkstationFriendly": true,
        "workstationDetails": {
          "hasDesk": true,
          "hasChair": true,
          "hasPowerOutlets": true,
          "hasGoodLighting": true,
          "quietZone": true
        },
        "_id": "67890room5"
      },
      {
        "type": "Deluxe Private AC Room with Balcony and Ensuite Bathroom",
        "description": "Premium room with expansive balcony offering panoramic mountain views. Perfect for long-term stays and digital nomads.",
        "images": [
          "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-1.jpg",
          "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-view.jpg",
          "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-workspace.jpg",
          "https://s3.amazonaws.com/happygo/rooms/deluxe-balcony-bathroom.jpg"
        ],
        "capacity": 2,
        "totalBeds": 2,
        "availableBeds": 1,
        "amenities": [
          "Air Conditioning",
          "King Size Bed",
          "Large Wardrobe",
          "Executive Work Desk",
          "Ergonomic Chair",
          "Ensuite Bathroom",
          "Hot Water",
          "Smart TV",
          "Mini Fridge",
          "Tea/Coffee Maker",
          "Kettle",
          "Large Balcony with Seating",
          "Mountain View",
          "Premium Bedding",
          "Extra Storage",
          "Sofa",
          "Reading Corner"
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
        },
        "_id": "67890room6"
      }
    ],
    "guidelines": [
      "Check-in starts at 1:00 PM",
      "Check-out before 10:00 AM",
      "Valid ID proof required at check-in",
      "Advance booking recommended during peak season",
      "Pets not allowed",
      "Smoking only in designated areas"
    ],
    "checkInGuidelines": [
      "Reception open 24/7",
      "Early check-in subject to availability (additional charges may apply)",
      "Valid government-issued ID required",
      "Self check-in kiosks available",
      "Luggage storage available for early arrivals"
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
      "No outside guests allowed without prior approval",
      "Alcohol consumption only in designated areas",
      "Maximum 2 guests per private room"
    ],
    "ratings": 4.5,
    "numReviews": 342,
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
      "Whiteboard",
      "Projector",
      "24/7 Power Backup",
      "Coffee/Tea Maker in Co-working Area",
      "Ergonomic Seating"
    ],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-26T14:45:30.000Z",
    "__v": 2,
    "id": "67890abcdef12345"
  }
}
```

---

## ❌ Error Responses

### 1. Hostel Not Found (404)

**Scenario:** When the provided hostel ID doesn't exist in the database

```json
{
  "success": false,
  "error": "Hostel not found"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/invalid_id_here" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

### 2. Unauthorized - Missing Token (401)

**Scenario:** When no authentication token is provided

```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

### 3. Unauthorized - Invalid Token (401)

**Scenario:** When an invalid or expired token is provided

```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

### 4. Forbidden - Insufficient Permissions (403)

**Scenario:** When user doesn't have admin or employee with hostel module access

```json
{
  "success": false,
  "error": "User role user is not authorized to access this route"
}
```

**cURL Example:**
```bash
# Using a regular user token (not admin/employee)
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer REGULAR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

### 5. Validation Error - Missing Required Fields (400)

**Scenario:** When required fields are missing or invalid (during creation, but can occur during update if fields are explicitly set to invalid values)

```json
{
  "success": false,
  "error": "Hostel validation failed: name: Please add a name"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
```

---

### 6. Validation Error - Invalid Room Type (400)

**Scenario:** When room type is not one of the allowed enum values

```json
{
  "success": false,
  "error": "Hostel validation failed: rooms.0.type: `Invalid Room Type` is not a valid enum value for path `type`."
}
```

**Valid Room Types:**
- `Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom`
- `Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom`
- `Bed in 4 Bed Mixed AC Dormitory Room with Ensuite Bathroom`
- `Private AC Room with Ensuite Bathroom`
- `Deluxe Private AC Room with Ensuite Bathroom`
- `Deluxe Private AC Room with Balcony and Ensuite Bathroom`

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Invalid Room Type",
        "capacity": 6,
        "totalBeds": 6,
        "availableBeds": 6,
        "description": "Test room",
        "images": ["https://example.com/image.jpg"],
        "mealOptions": {
          "bedOnly": { "basePrice": 500 },
          "bedAndBreakfast": { "basePrice": 650 },
          "bedBreakfastAndDinner": { "basePrice": 850 }
        }
      }
    ]
  }'
```

---

### 7. Validation Error - Invalid Ratings (400)

**Scenario:** When ratings value is outside the allowed range (1-5)

```json
{
  "success": false,
  "error": "Hostel validation failed: ratings: Rating cannot be more than 5"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ratings": 6}'
```

---

### 8. Validation Error - Negative Capacity (400)

**Scenario:** When capacity or totalBeds is less than minimum allowed value

```json
{
  "success": false,
  "error": "Hostel validation failed: rooms.0.capacity: Capacity must be at least 1"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "capacity": 0,
        "totalBeds": 6,
        "availableBeds": 6,
        "description": "Test room",
        "images": ["https://example.com/image.jpg"],
        "mealOptions": {
          "bedOnly": { "basePrice": 500 },
          "bedAndBreakfast": { "basePrice": 650 },
          "bedBreakfastAndDinner": { "basePrice": 850 }
        }
      }
    ]
  }'
```

---

### 9. Validation Error - Missing Meal Options (400)

**Scenario:** When required meal option pricing is missing

```json
{
  "success": false,
  "error": "Hostel validation failed: rooms.0.mealOptions.bedOnly.basePrice: Please add bed only base price"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "capacity": 6,
        "totalBeds": 6,
        "availableBeds": 6,
        "description": "Test room",
        "images": ["https://example.com/image.jpg"],
        "mealOptions": {
          "bedOnly": {},
          "bedAndBreakfast": { "basePrice": 650 },
          "bedBreakfastAndDinner": { "basePrice": 850 }
        }
      }
    ]
  }'
```

---

### 10. Validation Error - Name Too Long (400)

**Scenario:** When name exceeds maximum allowed characters (100)

```json
{
  "success": false,
  "error": "Hostel validation failed: name: Name cannot be more than 100 characters"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "This is an extremely long hostel name that exceeds the maximum allowed character limit of one hundred characters which will cause a validation error"
  }'
```

---

### 11. Validation Error - Negative Available Beds (400)

**Scenario:** When availableBeds is negative

```json
{
  "success": false,
  "error": "Hostel validation failed: rooms.0.availableBeds: Available beds cannot be negative"
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "capacity": 6,
        "totalBeds": 6,
        "availableBeds": -1,
        "description": "Test room",
        "images": ["https://example.com/image.jpg"],
        "mealOptions": {
          "bedOnly": { "basePrice": 500 },
          "bedAndBreakfast": { "basePrice": 650 },
          "bedBreakfastAndDinner": { "basePrice": 850 }
        }
      }
    ]
  }'
```

---

### 12. Server Error (500)

**Scenario:** When an unexpected server error occurs

```json
{
  "success": false,
  "error": "Server Error",
  "message": "An unexpected error occurred. Please try again later."
}
```

**Note:** This typically happens due to:
- Database connection issues
- Invalid MongoDB ObjectId format
- Internal server errors

---

## 📝 Partial Update Examples

### Example 1: Update Only Name

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Hostel Name"}'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abc",
    "name": "Updated Hostel Name",
    "description": "Original description...",
    "location": "Chikkamagaluru",
    "...": "...other fields remain unchanged..."
  }
}
```

---

### Example 2: Update Only Pricing

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "capacity": 6,
        "totalBeds": 6,
        "availableBeds": 6,
        "description": "Room description",
        "images": ["https://s3.amazonaws.com/room.jpg"],
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
        }
      }
    ]
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abc",
    "name": "Original Hostel Name",
    "rooms": [
      {
        "type": "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        "capacity": 6,
        "totalBeds": 6,
        "availableBeds": 6,
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
        }
      }
    ],
    "...": "...other fields remain unchanged..."
  }
}
```

---

### Example 3: Update Only Contact Info

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactInfo": {
      "phone": "+91-9999999999",
      "email": "newemail@hostel.com",
      "whatsapp": "+91-9999999999"
    }
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abc",
    "name": "Original Hostel Name",
    "contactInfo": {
      "phone": "+91-9999999999",
      "email": "newemail@hostel.com",
      "whatsapp": "+91-9999999999"
    },
    "...": "...other fields remain unchanged..."
  }
}
```

---

### Example 4: Deactivate Hostel

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
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
    "name": "Hostel Name",
    "isActive": false,
    "...": "...other fields remain unchanged..."
  }
}
```

---

### Example 5: Update Amenities Only

**Request:**
```bash
curl -X PUT "http://localhost:8080/api/hostels/67890abc" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amenities": [
      {
        "name": "Ultra-Fast WiFi",
        "icon": "wifi",
        "description": "200 Mbps fiber connection"
      },
      {
        "name": "Gym",
        "icon": "dumbbell",
        "description": "Fully equipped gym"
      }
    ]
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hostel updated successfully",
  "data": {
    "_id": "67890abc",
    "name": "Hostel Name",
    "amenities": [
      {
        "name": "Ultra-Fast WiFi",
        "icon": "wifi",
        "description": "200 Mbps fiber connection",
        "_id": "newAmenity1"
      },
      {
        "name": "Gym",
        "icon": "dumbbell",
        "description": "Fully equipped gym",
        "_id": "newAmenity2"
      }
    ],
    "...": "...other fields remain unchanged..."
  }
}
```

---

## 🔍 Important Notes

### Field Requirements

**Always Required (for rooms):**
- `type` - Must be one of the 6 allowed enum values
- `description`
- `images` - Array with at least one image
- `capacity` - Minimum 1
- `totalBeds` - Minimum 1
- `availableBeds` - Minimum 0
- `mealOptions.bedOnly.basePrice`
- `mealOptions.bedAndBreakfast.basePrice`
- `mealOptions.bedBreakfastAndDinner.basePrice`

**Always Required (for hostel):**
- `name` - Max 100 characters
- `description`
- `location`
- `address`
- `images` - Array with at least one image

**Optional Fields:**
- `discountedPrice` for all meal options
- `workstationDetails` (only if `isWorkstationFriendly: true`)
- `amenities`
- `guidelines`
- `checkInGuidelines`
- `cancellationPolicies`
- `houseRules`
- `ratings` (1-5, default: 4)
- `numReviews` (default: 0)
- `isActive` (default: true)
- `checkInTime` (default: "1:00 PM")
- `checkOutTime` (default: "10:00 AM")
- `contactInfo`
- `supportsWorkstation` (default: false)
- `workstationAmenities`

### Tips for Successful Updates

1. **Partial Updates:** You only need to send the fields you want to update
2. **Room Updates:** When updating rooms, you need to send the complete room object(s)
3. **Validation:** All mongoose validators will run (`runValidators: true`)
4. **MongoDB ID:** Ensure the hostel ID is a valid MongoDB ObjectId
5. **Authorization:** Ensure you're using an admin or employee token with hostel module access

---

## 📞 Support

For technical issues or questions:
- Contact: Backend Development Team
- Email: backend@happygo.com

---

**Last Updated:** January 26, 2025
**API Version:** 2.0
**Endpoint:** `PUT /api/hostels/:id`

