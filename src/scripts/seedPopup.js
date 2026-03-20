import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import AWS from "aws-sdk";
import axios from "axios";

dotenv.config();

// ── Popup content ─────────────────────────────────────────────────────────────
const IMAGE_URL = "https://img.sanishtech.com/u/35cdcf21481f8ef08ab0770d3f4b11b3.jpg";
const TITLE = "🎉 Exclusive Combo Deal!";
const DESCRIPTION = "Get 10% Off when you book a bike and hostel together. Explore more, spend less — only on Happy Go!";
const SHOW = "always"; // "always" | "once"

// ── S3 helper ─────────────────────────────────────────────────────────────────
const uploadImageFromUrl = async (url) => {
  console.log("  ⬇️  Downloading image from URL…");
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);
  const contentType = response.headers["content-type"] || "image/jpeg";
  const ext = contentType.split("/")[1] || "jpg";

  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "us-east-1",
  });

  const key = `popups/main/${uuidv4()}.${ext}`;

  await s3
    .upload({
      Bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "private",
    })
    .promise();

  console.log(`  ✓ Uploaded to S3 → ${key}`);
  return key;
};

// ── Popup schema (mirrors popup.model.js) ────────────────────────────────────
const popupSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    imageKey: { type: String, default: null },
    show: { type: String, enum: ["always", "once"], default: "always" },
  },
  { timestamps: true }
);
const Popup =
  mongoose.models.Popup || mongoose.model("Popup", popupSchema);

// ── Main ──────────────────────────────────────────────────────────────────────
const run = async () => {
  console.log("\n🔌 Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("   Connected.\n");

  const imageKey = await uploadImageFromUrl(IMAGE_URL);

  console.log("\n💾 Saving popup to DB…");
  await Popup.findOneAndUpdate(
    {},
    { title: TITLE, description: DESCRIPTION, show: SHOW, imageKey },
    { upsert: true, new: true }
  );

  console.log("   ✓ Popup saved!\n");
  console.log(`   Title       : ${TITLE}`);
  console.log(`   Description : ${DESCRIPTION}`);
  console.log(`   Show        : ${SHOW}`);
  console.log(`   Image Key   : ${imageKey}\n`);

  await mongoose.disconnect();
  console.log("✅ Done.\n");
};

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
