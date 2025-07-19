import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Supported file types with their configurations
const FILE_CONFIGS = {
  images: {
    types: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: "images",
    enableCompression: true,
  },
  documents: {
    types: ["application/pdf", "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: "documents",
    enableCompression: false,
  },
  videos: {
    types: ["video/mp4", "video/webm", "video/quicktime"],
    maxSize: 100 * 1024 * 1024, // 100MB
    folder: "videos",
    enableCompression: false,
  }
};

// Helper function to determine file category
const getFileCategory = (mimetype) => {
  for (const [category, config] of Object.entries(FILE_CONFIGS)) {
    if (config.types.includes(mimetype)) {
      return category;
    }
  }
  return null;
};

// Helper function to validate file
const validateFile = (file, category) => {
  const config = FILE_CONFIGS[category];
  
  if (!config) {
    throw new ApiError(`Unsupported file type: ${file.mimetype}`, 400);
  }
  
  if (file.size > config.maxSize) {
    throw new ApiError(
      `File size too large. Maximum size for ${category} is ${config.maxSize / (1024 * 1024)}MB`,
      400
    );
  }
  
  return config;
};

// Helper function to compress images
const compressImage = async (buffer, mimetype) => {
  try {
    const isJpeg = mimetype === "image/jpeg" || mimetype === "image/jpg";
    
    let compressed = sharp(buffer)
      .resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true });
    
    if (isJpeg) {
      compressed = compressed.jpeg({ quality: 85, progressive: true });
    } else if (mimetype === "image/png") {
      compressed = compressed.png({ quality: 85, progressive: true });
    } else if (mimetype === "image/webp") {
      compressed = compressed.webp({ quality: 85 });
    }
    
    return await compressed.toBuffer();
  } catch (error) {
    console.error("Image compression failed:", error);
    return buffer; // Return original if compression fails
  }
};

// @desc    Upload multiple files to S3 with validation and compression
// @route   POST /api/file-upload
// @access  Private
export const uploadFiles = asyncHandler(async (req, res) => {
  console.log("File upload request received:", {
    filesCount: req.files?.length || 0,
    body: req.body
  });

  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  const { folder } = req.body; // Optional custom folder
  const uploadResults = [];
  const errors = [];

  try {
    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Determine file category
        const category = getFileCategory(file.mimetype);
        if (!category) {
          errors.push({
            fileName: file.originalname,
            error: `Unsupported file type: ${file.mimetype}`
          });
          continue;
        }

        // Validate file
        const config = validateFile(file, category);
        
        // Generate unique filename
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;
        
        // Determine upload folder
        const uploadFolder = folder || config.folder;
        
        // Process file buffer
        let processedBuffer = file.buffer;
        
        // Compress images if enabled
        if (config.enableCompression && category === 'images') {
          processedBuffer = await compressImage(file.buffer, file.mimetype);
        }
        
        // Convert to base64 for S3 upload
        const base64Data = `data:${file.mimetype};base64,${processedBuffer.toString('base64')}`;
        
        // Upload to S3
        const s3Url = await uploadToS3(base64Data, uploadFolder, uniqueFileName);
        
        // Store result
        uploadResults.push({
          originalName: file.originalname,
          fileName: uniqueFileName,
          mimetype: file.mimetype,
          size: file.size,
          compressedSize: processedBuffer.length,
          category,
          folder: uploadFolder,
          url: s3Url,
          compressed: config.enableCompression && category === 'images'
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        errors.push({
          fileName: file.originalname,
          error: fileError.message
        });
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s)`,
      data: {
        files: uploadResults,
        urls: uploadResults.map(file => file.url),
        summary: {
          total: req.files.length,
          successful: uploadResults.length,
          failed: errors.length,
          totalSize: uploadResults.reduce((sum, file) => sum + file.size, 0),
          compressedSize: uploadResults.reduce((sum, file) => sum + file.compressedSize, 0)
        }
      }
    };

    // Include errors if any
    if (errors.length > 0) {
      response.data.errors = errors;
      response.message += `, ${errors.length} file(s) failed`;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("Error in file upload process:", error);
    throw new ApiError(error.message || "Failed to upload files", 500);
  }
});

// @desc    Upload base64 files to S3
// @route   POST /api/file-upload/base64
// @access  Private
export const uploadBase64Files = asyncHandler(async (req, res) => {
  const { files, folder = "uploads" } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new ApiError("Please provide an array of base64 files", 400);
  }

  const uploadResults = [];
  const errors = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      
      try {
        // Validate base64 format
        if (!fileData.data || !fileData.data.startsWith('data:')) {
          errors.push({
            index: i,
            error: "Invalid base64 format"
          });
          continue;
        }

        // Extract mime type and validate
        const mimeMatch = fileData.data.match(/^data:([^;]+);base64,/);
        if (!mimeMatch) {
          errors.push({
            index: i,
            error: "Could not determine file type"
          });
          continue;
        }

        const mimetype = mimeMatch[1];
        const category = getFileCategory(mimetype);
        
        if (!category) {
          errors.push({
            index: i,
            error: `Unsupported file type: ${mimetype}`
          });
          continue;
        }

        // Generate unique filename
        const fileExtension = fileData.name ? 
          fileData.name.split('.').pop() : 
          getExtensionFromMimeType(mimetype);
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;
        
        // Upload to S3
        const s3Url = await uploadToS3(fileData.data, folder, uniqueFileName);
        
        uploadResults.push({
          originalName: fileData.name || `file_${i}`,
          fileName: uniqueFileName,
          mimetype,
          category,
          folder,
          url: s3Url
        });

      } catch (fileError) {
        console.error(`Error processing base64 file ${i}:`, fileError);
        errors.push({
          index: i,
          error: fileError.message
        });
      }
    }

    const response = {
      success: true,
      message: `Successfully uploaded ${uploadResults.length} file(s)`,
      data: {
        files: uploadResults,
        urls: uploadResults.map(file => file.url),
        summary: {
          total: files.length,
          successful: uploadResults.length,
          failed: errors.length
        }
      }
    };

    if (errors.length > 0) {
      response.data.errors = errors;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("Error in base64 upload process:", error);
    throw new ApiError(error.message || "Failed to upload base64 files", 500);
  }
});

// @desc    Delete file from S3
// @route   DELETE /api/file-upload
// @access  Private
export const deleteFile = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    throw new ApiError("File URL is required", 400);
  }

  try {
    await deleteFromS3(url);
    
    res.status(200).json({
      success: true,
      message: "File deleted successfully",
      data: { deletedUrl: url }
    });

  } catch (error) {
    console.error("Error deleting file:", error);
    throw new ApiError(error.message || "Failed to delete file", 500);
  }
});

// @desc    Get upload configuration and limits
// @route   GET /api/file-upload/config
// @access  Public
export const getUploadConfig = asyncHandler(async (req, res) => {
  const config = {};
  
  for (const [category, settings] of Object.entries(FILE_CONFIGS)) {
    config[category] = {
      allowedTypes: settings.types,
      maxSize: settings.maxSize,
      maxSizeMB: Math.round(settings.maxSize / (1024 * 1024)),
      folder: settings.folder,
      compressionEnabled: settings.enableCompression
    };
  }

  res.status(200).json({
    success: true,
    data: {
      maxFiles: 10,
      categories: config,
      supportedFormats: Object.values(FILE_CONFIGS).flatMap(c => c.types)
    }
  });
});

// Helper function to get file extension from mime type
const getExtensionFromMimeType = (mimeType) => {
  const extensions = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg", 
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };
  
  return extensions[mimeType] || "bin";
}; 