import mongoose from "mongoose";
import dotenv from "dotenv";
import Cart from "../models/cart.model.js";

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

const cleanupDuplicateCarts = async () => {
  try {
    console.log("🧹 Starting cart cleanup...\n");

    // Find all users with multiple active carts
    const duplicateCarts = await Cart.aggregate([
      {
        $match: {
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
          carts: { $push: { id: "$_id", updatedAt: "$updatedAt" } },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    console.log(`📊 Found ${duplicateCarts.length} users with duplicate active carts\n`);

    if (duplicateCarts.length === 0) {
      console.log("✨ No duplicate carts found. Database is clean!");
      return;
    }

    let totalDeactivated = 0;

    for (const userCarts of duplicateCarts) {
      const userId = userCarts._id;
      const carts = userCarts.carts;

      // Sort by updatedAt descending (most recent first)
      carts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Keep the most recent cart, deactivate the rest
      const cartsToDeactivate = carts.slice(1).map((c) => c.id);

      console.log(`👤 User ${userId}:`);
      console.log(`   - Total active carts: ${carts.length}`);
      console.log(`   - Keeping most recent: ${carts[0].id} (${carts[0].updatedAt})`);
      console.log(`   - Deactivating ${cartsToDeactivate.length} older carts`);

      // Deactivate old carts
      const result = await Cart.updateMany(
        {
          _id: { $in: cartsToDeactivate },
        },
        {
          $set: { isActive: false },
        }
      );

      totalDeactivated += result.modifiedCount;
      console.log(`   ✅ Deactivated ${result.modifiedCount} carts\n`);
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   - Total carts deactivated: ${totalDeactivated}`);
    console.log(`   - Users affected: ${duplicateCarts.length}`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    throw error;
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await cleanupDuplicateCarts();
  await mongoose.connection.close();
  console.log("\n👋 Database connection closed");
  process.exit(0);
};

main();

