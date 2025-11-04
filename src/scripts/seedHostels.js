import mongoose from "mongoose";
import dotenv from "dotenv";
import Hostel from "../models/hostel.model.js";

dotenv.config();

const hostels = [
  {
    name: "Mountain View Hostel",
    description: "A cozy hostel nestled in the hills of Chikkamagaluru, perfect for backpackers and solo travelers. Enjoy stunning mountain views, comfortable beds, and a friendly atmosphere.",
    location: "Chikkamagaluru",
    address: "Mullodi Village, Chikkamagaluru District, Karnataka 577101",
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
    ],
    amenities: [
      {
        name: "24/7 Front Desk",
        icon: "desk",
        description: "Round the clock assistance",
      },
      {
        name: "Free WiFi",
        icon: "wifi",
        description: "High-speed internet throughout the property",
      },
      {
        name: "Common Area",
        icon: "common",
        description: "Spacious common lounge area",
      },
      {
        name: "Common Washroom",
        icon: "washroom",
        description: "Clean and well-maintained washrooms",
      },
      {
        name: "Geyser",
        icon: "geyser",
        description: "Hot water available 24/7",
      },
      {
        name: "Home Theatre",
        icon: "theatre",
        description: "Entertainment room with projector",
      },
      {
        name: "Indoor Games",
        icon: "games",
        description: "Carrom, chess, and board games",
      },
      {
        name: "Laundry",
        icon: "laundry",
        description: "Laundry service available",
      },
      {
        name: "Lockers",
        icon: "locker",
        description: "Personal lockers for valuables",
      },
      {
        name: "Parking",
        icon: "parking",
        description: "Free parking for bikes and cars",
      },
    ],
    rooms: [
      {
        type: "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        description: "Spacious air-conditioned dormitory with 10 bunk beds, personal lockers, reading lights, and an ensuite bathroom. Perfect for budget travelers and backpackers.",
        images: [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
        ],
        capacity: 10,
        mealOptions: {
          bedOnly: {
            basePrice: 978,
            discountedPrice: 585.33,
          },
          bedAndBreakfast: {
            basePrice: 1178,
            discountedPrice: 785.33,
          },
          bedBreakfastAndDinner: {
            basePrice: 1378,
            discountedPrice: 985.33,
          },
        },
        amenities: ["Locker", "Fan", "Air conditioner", "Ensuite Washroom", "Reading Light", "Power Outlets"],
        totalBeds: 10,
        availableBeds: 10,
        isWorkstationFriendly: false,
      },
      {
        type: "Bed in 6 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        description: "Comfortable 6-bed dormitory with AC, personal lockers, and ensuite bathroom. Great for small groups and solo travelers.",
        images: [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        ],
        capacity: 6,
        mealOptions: {
          bedOnly: {
            basePrice: 1180,
            discountedPrice: 780,
          },
          bedAndBreakfast: {
            basePrice: 1380,
            discountedPrice: 980,
          },
          bedBreakfastAndDinner: {
            basePrice: 1580,
            discountedPrice: 1180,
          },
        },
        amenities: ["Locker", "Fan", "Air conditioner", "Ensuite Washroom", "Reading Light"],
        totalBeds: 6,
        availableBeds: 6,
        isWorkstationFriendly: true,
        workstationDetails: {
          hasDesk: true,
          hasChair: true,
          hasPowerOutlets: true,
          hasGoodLighting: true,
          quietZone: true,
        },
      },
      {
        type: "Bed in 4 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        description: "Intimate 4-bed dormitory with premium amenities, perfect for small groups or friends traveling together.",
        images: [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        ],
        capacity: 4,
        mealOptions: {
          bedOnly: {
            basePrice: 1480,
            discountedPrice: 980,
          },
          bedAndBreakfast: {
            basePrice: 1680,
            discountedPrice: 1180,
          },
          bedBreakfastAndDinner: {
            basePrice: 1880,
            discountedPrice: 1380,
          },
        },
        amenities: ["Locker", "Fan", "Air conditioner", "Ensuite Washroom", "Reading Light", "USB Charging"],
        totalBeds: 4,
        availableBeds: 4,
        isWorkstationFriendly: true,
        workstationDetails: {
          hasDesk: true,
          hasChair: true,
          hasPowerOutlets: true,
          hasGoodLighting: true,
          quietZone: true,
        },
      },
    ],
    guidelines: [
      "Check-in time: 1:00 PM",
      "Check-out time: 10:00 AM",
      "Government-issued photo ID required",
      "Passport required for foreign nationals",
    ],
    checkInGuidelines: [
      "Original government ID proof is mandatory",
      "Advance payment required at the time of check-in",
      "Self check-in with host assistance available",
    ],
    cancellationPolicies: [
      "Free cancellation up to 24 hours before check-in",
      "50% refund for cancellations made 12-24 hours before check-in",
      "No refund for same-day cancellations or no-shows",
    ],
    houseRules: [
      "No smoking inside the premises",
      "Quiet hours: 10:00 PM - 7:00 AM",
      "No outside guests allowed after 9:00 PM",
      "Shoes must be removed in dormitories",
      "Maintain cleanliness in common areas",
    ],
    ratings: 4.5,
    numReviews: 127,
    isActive: true,
    checkInTime: "1:00 PM",
    checkOutTime: "10:00 AM",
    contactInfo: {
      phone: "+91-8123456789",
      email: "info@mountainviewhostel.com",
      whatsapp: "+91-8123456789",
    },
    supportsWorkstation: true,
    workstationAmenities: [
      "High-speed WiFi (100 Mbps)",
      "Dedicated workspace with desk",
      "Comfortable chair",
      "Multiple power outlets",
      "Good natural lighting",
      "Quiet environment",
    ],
  },
  {
    name: "Hilltop Retreat Hostel",
    description: "Luxurious hostel offering both dormitories and private rooms with breathtaking views. Perfect for travelers seeking comfort and nature. Features private balconies in select rooms.",
    location: "Chikkamagaluru",
    address: "Hirekolale Lake Road, Chikkamagaluru, Karnataka 577101",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
    ],
    amenities: [
      {
        name: "24/7 Front Desk",
        icon: "desk",
        description: "Always available to help",
      },
      {
        name: "AC",
        icon: "ac",
        description: "Air conditioning in all rooms",
      },
      {
        name: "Free WiFi",
        icon: "wifi",
        description: "High-speed internet",
      },
      {
        name: "Restaurant",
        icon: "restaurant",
        description: "On-site restaurant",
      },
      {
        name: "Terrace",
        icon: "terrace",
        description: "Beautiful terrace with mountain views",
      },
      {
        name: "Bonfire Area",
        icon: "fire",
        description: "Evening bonfire arrangements",
      },
      {
        name: "Parking",
        icon: "parking",
        description: "Ample parking space",
      },
      {
        name: "Library",
        icon: "book",
        description: "Small library with books and magazines",
      },
    ],
    rooms: [
      {
        type: "Deluxe Private AC Room with Balcony and Ensuite Bathroom",
        description: "Spacious private room with king-size bed, AC, private balcony with mountain views, work desk, and modern ensuite bathroom. Perfect for couples or solo travelers seeking privacy.",
        images: [
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
        ],
        capacity: 2,
        mealOptions: {
          bedOnly: {
            basePrice: 4200,
            discountedPrice: 3200.18,
          },
          bedAndBreakfast: {
            basePrice: 5500,
            discountedPrice: 3800,
          },
          bedBreakfastAndDinner: {
            basePrice: 6800,
            discountedPrice: 4500,
          },
        },
        amenities: [
          "Blanket",
          "Lamp",
          "Locker",
          "Linen",
          "Towels",
          "Air conditioner",
          "Private Balcony",
          "Work Desk",
          "Mini Fridge",
          "Tea/Coffee Maker",
          "Smart TV",
        ],
        totalBeds: 3,
        availableBeds: 3,
        isWorkstationFriendly: true,
        workstationDetails: {
          hasDesk: true,
          hasChair: true,
          hasPowerOutlets: true,
          hasGoodLighting: true,
          quietZone: true,
        },
      },
      {
        type: "Private AC Room with Ensuite Bathroom",
        description: "Comfortable private room with queen-size bed, AC, work area, and modern bathroom. Ideal for solo travelers or couples.",
        images: [
          "https://images.unsplash.com/photo-1631049035324-0f6f82a6e35e?w=800",
        ],
        capacity: 2,
        mealOptions: {
          bedOnly: {
            basePrice: 3200,
            discountedPrice: 2400,
          },
          bedAndBreakfast: {
            basePrice: 3900,
            discountedPrice: 2900,
          },
          bedBreakfastAndDinner: {
            basePrice: 4600,
            discountedPrice: 3400,
          },
        },
        amenities: [
          "Blanket",
          "Lamp",
          "Locker",
          "Linen",
          "Towels",
          "Air conditioner",
          "Work Desk",
        ],
        totalBeds: 4,
        availableBeds: 4,
        isWorkstationFriendly: true,
        workstationDetails: {
          hasDesk: true,
          hasChair: true,
          hasPowerOutlets: true,
          hasGoodLighting: true,
          quietZone: false,
        },
      },
      {
        type: "Bed in 10 Bed Mixed AC Dormitory Room with Ensuite Bathroom",
        description: "Budget-friendly dormitory option with comfortable beds, personal lockers, and clean facilities.",
        images: [
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
        ],
        capacity: 10,
        mealOptions: {
          bedOnly: {
            basePrice: 900,
            discountedPrice: 650,
          },
          bedAndBreakfast: {
            basePrice: 1100,
            discountedPrice: 850,
          },
          bedBreakfastAndDinner: {
            basePrice: 1300,
            discountedPrice: 1050,
          },
        },
        amenities: ["Locker", "Fan", "Air conditioner", "Ensuite Washroom", "Reading Light"],
        totalBeds: 10,
        availableBeds: 10,
        isWorkstationFriendly: false,
      },
    ],
    guidelines: [
      "Check-in time: 1:00 PM",
      "Check-out time: 10:00 AM",
      "Valid ID proof required",
      "Couples must provide proof of marriage",
    ],
    checkInGuidelines: [
      "Original ID required for all guests",
      "Payment in full at check-in",
      "Early check-in subject to availability",
    ],
    cancellationPolicies: [
      "Free cancellation up to 48 hours before check-in",
      "50% refund for cancellations made 24-48 hours before check-in",
      "No refund for cancellations within 24 hours",
    ],
    houseRules: [
      "Strictly no smoking inside rooms",
      "Quiet hours: 10:00 PM - 7:00 AM",
      "Visitors not allowed after 8:00 PM",
      "No loud music or parties",
      "Pets not allowed",
    ],
    ratings: 4.7,
    numReviews: 203,
    isActive: true,
    checkInTime: "1:00 PM",
    checkOutTime: "10:00 AM",
    contactInfo: {
      phone: "+91-9876543210",
      email: "contact@hilltopretreat.com",
      whatsapp: "+91-9876543210",
    },
    supportsWorkstation: true,
    workstationAmenities: [
      "High-speed WiFi (150 Mbps)",
      "Private workspace in select rooms",
      "Ergonomic chair",
      "Power backup",
      "Quiet zones",
      "Meeting room available on request",
    ],
  },
];

async function seedHostels() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing hostels
    await Hostel.deleteMany({});
    console.log("🗑️  Cleared existing hostels");

    // Insert new hostels
    const insertedHostels = await Hostel.insertMany(hostels);
    console.log(`✅ Successfully added ${insertedHostels.length} hostels to the database!`);

    // Display hostel details
    insertedHostels.forEach((hostel, index) => {
      console.log(`\n📍 Hostel ${index + 1}: ${hostel.name}`);
      console.log(`   ID: ${hostel._id}`);
      console.log(`   Location: ${hostel.location}`);
      console.log(`   Rooms: ${hostel.rooms.length}`);
      console.log(`   Workstation Support: ${hostel.supportsWorkstation ? "Yes" : "No"}`);
      console.log(`   Rating: ${hostel.ratings} (${hostel.numReviews} reviews)`);
    });

    console.log("\n🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding hostels:", error);
    process.exit(1);
  }
}

seedHostels();

