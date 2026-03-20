import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

// Configure AWS
const configureAWS = () => {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "ap-south-1",
  });

  return new AWS.S3();
};

// Module-level S3 instance used by uploadToS3Image and getSignedUrl
const s3 = configureAWS();

// Resolve bucket name lazily so dotenv has time to load
const getBucket = () => process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;

export const uploadToS3Image = async ({ buffer, fileName, contentType }) => {
  const params = {
    Bucket: getBucket(),
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    ACL: "private",
  };

  await s3.upload(params).promise();
  return fileName; // Return the key
};

export const getSignedUrl = (key, expires = 3600) => {
  const params = {
    Bucket: getBucket(),
    Key: key,
    Expires: expires,
  };

  return s3.getSignedUrl("getObject", params);
};

/**
 * Upload a file to S3
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} folder - Folder name in S3 bucket
 * @param {string} fileName - Optional file name (will generate UUID if not provided)
 * @returns {Promise<string>} - S3 file URL
 */
export const uploadToS3 = async (
  base64Data,
  folder = "bikes",
  fileName = null
) => {
  try {
    const s3 = configureAWS();
    const bucketName = process.env.AWS_S3_BUCKET;

    if (!bucketName) {
      throw new Error("AWS S3 bucket name is not configured");
    }

    // Parse base64 data
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    // Generate file name if not provided
    const fileKey =
      fileName ||
      `${folder}/${uuidv4()}.${getExtensionFromMimeType(contentType)}`;

    // Set up S3 upload parameters
    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    };

    // Upload to S3
    const { Location } = await s3.upload(params).promise();

    return Location;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {string} fileUrl - S3 file URL
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromS3 = async (fileUrl) => {
  try {
    const s3 = configureAWS();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("AWS S3 bucket name is not configured");
    }

    // Extract key from URL
    const urlParts = fileUrl.split("/");
    const key = urlParts.slice(3).join("/");

    // Set up S3 delete parameters
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    // Delete from S3
    await s3.deleteObject(params).promise();

    return true;
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
};

/**
 * Convert file to base64
 * @param {File} file - File object
 * @returns {Promise<string>} - Base64 encoded file
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Process and upload multiple images
 * @param {Array} images - Array of image files or base64 strings or URLs
 * @param {string} folder - S3 folder name
 * @returns {Promise<Array<string>>} - Array of S3 image URLs
 */
export const processAndUploadImages = async (images, folder = "bikes") => {
  try {
    const uploadedUrls = [];

    for (const image of images) {
      // If image is already a URL and not a base64 string, keep it as is
      if (typeof image === "string" && !image.startsWith("data:")) {
        uploadedUrls.push(image);
        continue;
      }

      // If image is a base64 string
      if (typeof image === "string" && image.startsWith("data:")) {
        const imageUrl = await uploadToS3(image, folder);
        uploadedUrls.push(imageUrl);
        continue;
      }

      // If image is an object with url property (from frontend)
      if (image && image.url) {
        if (image.url.startsWith("data:")) {
          // It's a base64 string
          const imageUrl = await uploadToS3(image.url, folder);
          uploadedUrls.push(imageUrl);
        } else {
          // It's already a URL
          uploadedUrls.push(image.url);
        }
        continue;
      }

      // If image is a file object from multer
      if (image && image.path) {
        // Convert file to base64
        const base64Data = await filePathToBase64(image.path);
        const imageUrl = await uploadToS3(base64Data, folder);
        uploadedUrls.push(imageUrl);
        continue;
      }

      console.error("Unsupported image format:", image);
    }

    return uploadedUrls;
  } catch (error) {
    console.error("Error processing and uploading images:", error);
    throw error;
  }
};

/**
 * Convert file path to base64
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - Base64 encoded file
 */
export const filePathToBase64 = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return reject(err);
      }

      // Get mime type based on file extension
      const mimeType = getMimeType(path.extname(filePath));
      const base64 = `data:${mimeType};base64,${data.toString("base64")}`;
      resolve(base64);
    });
  });
};

/**
 * Get mime type from file extension
 * @param {string} extension - File extension
 * @returns {string} - Mime type
 */
export const getMimeType = (extension) => {
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
};

/**
 * Get file extension from mime type
 * @param {string} mimeType - Mime type
 * @returns {string} - File extension
 */
export const getExtensionFromMimeType = (mimeType) => {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };

  return extensions[mimeType] || "jpg";
};

/**
 * Download file from URL and convert to base64
 * @param {string} url - File URL
 * @returns {Promise<string>} - Base64 encoded file
 */
export const downloadFileToBase64 = async (url) => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");
    const contentType = response.headers["content-type"];
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};

/**
 * Create a temporary file from base64 data
 * @param {string} base64Data - Base64 encoded file data
 * @returns {Promise<string>} - Path to temporary file
 */
export const createTempFileFromBase64 = async (base64Data) => {
  try {
    // Parse base64 data
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    // Create temp file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(
      tempDir,
      `${uuidv4()}.${getExtensionFromMimeType(contentType)}`
    );

    // Write buffer to temp file
    await fs.promises.writeFile(tempFilePath, buffer);

    return tempFilePath;
  } catch (error) {
    console.error("Error creating temp file:", error);
    throw error;
  }
};
