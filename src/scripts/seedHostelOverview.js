import mongoose from "mongoose";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import AWS from "aws-sdk";
import path from "path";

dotenv.config();

// ── Image paths (from Cursor assets) ─────────────────────────────────────────
const IMAGE_PATHS = [
  // Happy Go building — shown first (large hero image)
  "/Users/ntiw3005/.cursor/projects/Users-ntiw3005-Downloads-Learning/assets/WhatsApp_Image_2026-03-15_at_11.48.39-54ba108a-722b-48d2-807c-100bb1c197be.png",
  // Scenic river attached to property
  "/Users/ntiw3005/.cursor/projects/Users-ntiw3005-Downloads-Learning/assets/WhatsApp_Image_2026-03-15_at_11.41.28-cbce0c13-aaf3-4e32-9bf6-6a9a14b7a268.png",
  // Fun indoor games room
  "/Users/ntiw3005/.cursor/projects/Users-ntiw3005-Downloads-Learning/assets/WhatsApp_Image_2026-03-15_at_11.43.01-fdf6e56b-3967-422d-bd63-812e86243593.png",
  // Coffee estate walk
  "/Users/ntiw3005/.cursor/projects/Users-ntiw3005-Downloads-Learning/assets/WhatsApp_Image_2026-03-15_at_11.42.41-10fa9ff6-1feb-447e-a08f-4760eca37665.png",
];

// ── Hostel Overview content ───────────────────────────────────────────────────
const TITLE = "Happy Go Hostel — Chikkamagaluru";
const DESCRIPTION =
  "Nestled in the heart of Chikkamagaluru's lush coffee country, Happy Go Hostel is your perfect base to explore misty mountains, serene rivers, and sprawling coffee estates. Wake up to crisp hill-station air, take a guided coffee estate walk, unwind by our scenic riverside spot, or compete at indoor games with fellow travellers. At Happy Go, every stay is a memory made.";

// ── S3 helper ─────────────────────────────────────────────────────────────────
const uploadImage = async (filePath) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "us-east-1",
  });

  const buffer = readFileSync(filePath);
  const ext = path.extname(filePath).replace(".", "");
  const key = `hostel-overview/${uuidv4()}.${ext}`;
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  await s3
    .upload({
      Bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "private",
    })
    .promise();

  console.log(`  ✓ Uploaded: ${path.basename(filePath)} → ${key}`);
  return key;
};

// ── Mongoose schema (inline, mirrors hostelOverview.model.js) ─────────────────
const hostelOverviewSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    imageKeys: { type: [String], default: [] },
  },
  { timestamps: true }
);
const HostelOverview =
  mongoose.models.HostelOverview ||
  mongoose.model("HostelOverview", hostelOverviewSchema);

// ── Main ──────────────────────────────────────────────────────────────────────
const run = async () => {
  console.log("\n🔌 Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("   Connected.\n");

  console.log("⬆️  Uploading images to S3…");
  const imageKeys = [];
  for (const imgPath of IMAGE_PATHS) {
    const key = await uploadImage(imgPath);
    imageKeys.push(key);
  }

  console.log("\n💾 Saving hostel overview to DB…");
  await HostelOverview.findOneAndUpdate(
    {},
    { title: TITLE, description: DESCRIPTION, imageKeys },
    { upsert: true, new: true }
  );

  console.log("   ✓ Hostel overview saved!\n");
  console.log(`   Title       : ${TITLE}`);
  console.log(`   Description : ${DESCRIPTION.substring(0, 60)}…`);
  console.log(`   Images      : ${imageKeys.length} uploaded\n`);

  await mongoose.disconnect();
  console.log("✅ Done.\n");
};

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
