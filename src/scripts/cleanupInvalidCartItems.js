import mongoose from "mongoose";
import dotenv from "dotenv";
import Cart from "../models/cart.model.js";
import Bike from "../models/bike.model.js";
import Hostel from "../models/hostel.model.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

const cleanupInvalidCartItems = async () => {
  try {
    console.log("🧹 Starting invalid cart items cleanup...\n");

    // Get all active carts
    const carts = await Cart.find({ isActive: true });
    console.log(`📊 Found ${carts.length} active carts\n`);

    if (carts.length === 0) {
      console.log("✨ No active carts found. Database is clean!");
      return;
    }

    let totalCartsUpdated = 0;
    let totalBikesRemoved = 0;
    let totalHostelsRemoved = 0;

    // Get all valid bike and hostel IDs
    const validBikeIds = new Set(
      (await Bike.find({}, "_id")).map((b) => b._id.toString())
    );
    const validHostelIds = new Set(
      (await Hostel.find({}, "_id")).map((h) => h._id.toString())
    );

    console.log(`🏍️  Valid bikes in database: ${validBikeIds.size}`);
    console.log(`🏨 Valid hostels in database: ${validHostelIds.size}\n`);

    for (const cart of carts) {
      let cartUpdated = false;
      let bikesRemovedFromCart = 0;
      let hostelsRemovedFromCart = 0;

      // Filter invalid bike items
      const originalBikeCount = cart.bikeItems.length;
      cart.bikeItems = cart.bikeItems.filter((item) => {
        if (!item.bike) {
          bikesRemovedFromCart++;
          return false;
        }
        const bikeId = item.bike.toString();
        const isValid = validBikeIds.has(bikeId);
        if (!isValid) {
          bikesRemovedFromCart++;
        }
        return isValid;
      });

      // Filter invalid hostel items
      const originalHostelCount = cart.hostelItems.length;
      cart.hostelItems = cart.hostelItems.filter((item) => {
        if (!item.hostel) {
          hostelsRemovedFromCart++;
          return false;
        }
        const hostelId = item.hostel.toString();
        const isValid = validHostelIds.has(hostelId);
        if (!isValid) {
          hostelsRemovedFromCart++;
        }
        return isValid;
      });

      if (bikesRemovedFromCart > 0 || hostelsRemovedFromCart > 0) {
        cartUpdated = true;
        totalBikesRemoved += bikesRemovedFromCart;
        totalHostelsRemoved += hostelsRemovedFromCart;

        console.log(`🛒 Cart ${cart._id}:`);
        console.log(`   User: ${cart.user}`);
        if (bikesRemovedFromCart > 0) {
          console.log(`   ❌ Removed ${bikesRemovedFromCart} invalid bike(s)`);
        }
        if (hostelsRemovedFromCart > 0) {
          console.log(`   ❌ Removed ${hostelsRemovedFromCart} invalid hostel(s)`);
        }

        // Recalculate pricing
        let bikeSubtotal = 0;
        let hostelSubtotal = 0;

        // Sum up bike pricing
        if (cart.bikeItems.length > 0) {
          bikeSubtotal = cart.bikeItems.reduce(
            (sum, item) => sum + (item.totalPrice || 0),
            0
          );
        }

        // Sum up hostel pricing
        if (cart.hostelItems.length > 0) {
          hostelSubtotal = cart.hostelItems.reduce(
            (sum, item) => sum + (item.totalPrice || 0),
            0
          );
        }

        // Reset helmet if no bikes
        if (cart.bikeItems.length === 0) {
          cart.helmetDetails = { quantity: 0, charges: 0 };
        }

        // Update pricing
        cart.pricing = {
          bikeSubtotal,
          hostelSubtotal,
          subtotal: bikeSubtotal + hostelSubtotal,
          bulkDiscount: cart.pricing?.bulkDiscount || { amount: 0, percentage: 0 },
          surgeMultiplier: cart.pricing?.surgeMultiplier || 1,
          extraCharges: cart.pricing?.extraCharges || 0,
          gst: Math.round(((bikeSubtotal + hostelSubtotal) * 5) / 100),
          gstPercentage: 5,
          total:
            bikeSubtotal +
            hostelSubtotal +
            Math.round(((bikeSubtotal + hostelSubtotal) * 5) / 100),
        };

        console.log(`   💰 Updated pricing: ₹${cart.pricing.total}`);

        // Save cart
        await cart.save();
        totalCartsUpdated++;
        console.log(`   ✅ Cart updated\n`);
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   - Total carts checked: ${carts.length}`);
    console.log(`   - Carts updated: ${totalCartsUpdated}`);
    console.log(`   - Invalid bikes removed: ${totalBikesRemoved}`);
    console.log(`   - Invalid hostels removed: ${totalHostelsRemoved}`);

    if (totalCartsUpdated === 0) {
      console.log(`\n✨ All carts are clean! No invalid items found.`);
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await cleanupInvalidCartItems();
  await mongoose.connection.close();
  console.log("\n👋 Database connection closed");
  process.exit(0);
};

main();

