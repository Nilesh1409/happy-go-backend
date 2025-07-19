# File Upload API - cURL Examples

## Prerequisites
```bash
# Set your base URL and token
BASE_URL="http://localhost:5000"
TOKEN="your_jwt_token_here"
```

## 1. Get Upload Configuration (Public)

### Request
```bash
curl -X GET "${BASE_URL}/api/file-upload/config" \
  -H "Content-Type: application/json"
```

### Success Response
```json
{
  "success": true,
  "data": {
    "maxFiles": 10,
    "categories": {
      "images": {
        "allowedTypes": [
          "image/jpeg",
          "image/jpg", 
          "image/png",
          "image/webp",
          "image/gif"
        ],
        "maxSize": 10485760,
        "maxSizeMB": 10,
        "folder": "images",
        "compressionEnabled": true
      },
      "documents": {
        "allowedTypes": [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        "maxSize": 20971520,
        "maxSizeMB": 20,
        "folder": "documents",
        "compressionEnabled": false
      },
      "videos": {
        "allowedTypes": [
          "video/mp4",
          "video/webm",
          "video/quicktime"
        ],
        "maxSize": 104857600,
        "maxSizeMB": 100,
        "folder": "videos",
        "compressionEnabled": false
      }
    },
    "supportedFormats": [
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
      "application/pdf", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "video/mp4", "video/webm", "video/quicktime"
    ]
  }
}
```

## 2. Upload Single File

### Request
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@/path/to/your/image.jpg"
```

### Success Response
```json
{
  "success": true,
  "message": "Successfully uploaded 1 file(s)",
  "data": {
    "files": [
      {
        "originalName": "image.jpg",
        "fileName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "mimetype": "image/jpeg",
        "size": 2048576,
        "compressedSize": 1024768,
        "category": "images",
        "folder": "images",
        "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        "compressed": true
      }
    ],
    "urls": [
      "https://your-bucket.s3.ap-south-1.amazonaws.com/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
    ],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0,
      "totalSize": 2048576,
      "compressedSize": 1024768
    }
  }
}
```

## 3. Upload Multiple Files with Custom Folder

### Request
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@/path/to/photo1.jpg" \
  -F "files=@/path/to/document.pdf" \
  -F "files=@/path/to/video.mp4" \
  -F "folder=user-uploads"
```

### Success Response
```json
{
  "success": true,
  "message": "Successfully uploaded 3 file(s)",
  "data": {
    "files": [
      {
        "originalName": "photo1.jpg",
        "fileName": "uuid-1.jpg",
        "mimetype": "image/jpeg",
        "size": 1500000,
        "compressedSize": 750000,
        "category": "images",
        "folder": "user-uploads",
        "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/user-uploads/uuid-1.jpg",
        "compressed": true
      },
      {
        "originalName": "document.pdf",
        "fileName": "uuid-2.pdf",
        "mimetype": "application/pdf",
        "size": 5000000,
        "compressedSize": 5000000,
        "category": "documents",
        "folder": "user-uploads",
        "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/user-uploads/uuid-2.pdf",
        "compressed": false
      },
      {
        "originalName": "video.mp4",
        "fileName": "uuid-3.mp4",
        "mimetype": "video/mp4",
        "size": 50000000,
        "compressedSize": 50000000,
        "category": "videos",
        "folder": "user-uploads",
        "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/user-uploads/uuid-3.mp4",
        "compressed": false
      }
    ],
    "urls": [
      "https://your-bucket.s3.ap-south-1.amazonaws.com/user-uploads/uuid-1.jpg",
      "https://your-bucket.s3.ap-south-1.amazonaws.com/user-uploads/uuid-2.pdf",
      "https://your-bucket.s3.ap-south-1.amazonaws.com/user-uploads/uuid-3.mp4"
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "totalSize": 56500000,
      "compressedSize": 55750000
    }
  }
}
```

## 4. Upload Base64 Files

### Request
```bash
curl -X POST "${BASE_URL}/api/file-upload/base64" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "name": "test-image.jpg",
        "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      }
    ],
    "folder": "base64-uploads"
  }'
```

### Success Response
```json
{
  "success": true,
  "message": "Successfully uploaded 1 file(s)",
  "data": {
    "files": [
      {
        "originalName": "test-image.jpg",
        "fileName": "uuid-base64.jpg",
        "mimetype": "image/jpeg",
        "category": "images",
        "folder": "base64-uploads",
        "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/base64-uploads/uuid-base64.jpg"
      }
    ],
    "urls": [
      "https://your-bucket.s3.ap-south-1.amazonaws.com/base64-uploads/uuid-base64.jpg"
    ],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0
    }
  }
}
```

## 5. Delete File

### Request
```bash
curl -X DELETE "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/images/uuid-file.jpg"
  }'
```

### Success Response
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "deletedUrl": "https://your-bucket.s3.ap-south-1.amazonaws.com/images/uuid-file.jpg"
  }
}
```

---

# Error Responses

## 1. Authentication Errors

### Missing Token
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -F "files=@/path/to/image.jpg"
```

**Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided"
}
```

### Invalid Token
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer invalid_token" \
  -F "files=@/path/to/image.jpg"
```

**Response (401):**
```json
{
  "success": false,
  "message": "Invalid token"
}
```

## 2. File Validation Errors

### No Files Uploaded
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response (400):**
```json
{
  "success": false,
  "message": "No files uploaded"
}
```

### File Too Large
```bash
# Upload a file larger than 10MB for images
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@/path/to/large-image.jpg"
```

**Response (400):**
```json
{
  "success": false,
  "message": "File too large. Maximum file size is 100MB.",
  "error": "FILE_TOO_LARGE"
}
```

### Unsupported File Type
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@/path/to/script.exe"
```

**Response (400):**
```json
{
  "success": false,
  "message": "Unsupported file type: application/x-msdownload. Allowed types: image/jpeg, image/jpg, image/png, image/webp, image/gif, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, video/mp4, video/webm, video/quicktime",
  "error": "UNSUPPORTED_FILE_TYPE"
}
```

### Too Many Files
```bash
# Upload more than 10 files
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@file1.jpg" \
  -F "files=@file2.jpg" \
  -F "files=@file3.jpg" \
  -F "files=@file4.jpg" \
  -F "files=@file5.jpg" \
  -F "files=@file6.jpg" \
  -F "files=@file7.jpg" \
  -F "files=@file8.jpg" \
  -F "files=@file9.jpg" \
  -F "files=@file10.jpg" \
  -F "files=@file11.jpg"
```

**Response (400):**
```json
{
  "success": false,
  "message": "Too many files. Maximum 10 files allowed per request.",
  "error": "TOO_MANY_FILES"
}
```

### Wrong Field Name
```bash
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/path/to/image.jpg"  # Should be "files"
```

**Response (400):**
```json
{
  "success": false,
  "message": "Unexpected field name. Use \"files\" as the field name.",
  "error": "UNEXPECTED_FIELD"
}
```

## 3. Mixed Success/Failure Response

### Some Files Failed
```bash
# Upload mix of valid and invalid files
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@/path/to/valid-image.jpg" \
  -F "files=@/path/to/invalid-file.exe" \
  -F "files=@/path/to/too-large-file.jpg"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully uploaded 1 file(s), 2 file(s) failed",
  "data": {
    "files": [
      {
        "originalName": "valid-image.jpg",
        "fileName": "uuid-success.jpg",
        "mimetype": "image/jpeg",
        "size": 1024000,
        "compressedSize": 512000,
        "category": "images",
        "folder": "images",
        "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/images/uuid-success.jpg",
        "compressed": true
      }
    ],
    "urls": [
      "https://your-bucket.s3.ap-south-1.amazonaws.com/images/uuid-success.jpg"
    ],
    "summary": {
      "total": 3,
      "successful": 1,
      "failed": 2,
      "totalSize": 1024000,
      "compressedSize": 512000
    },
    "errors": [
      {
        "fileName": "invalid-file.exe",
        "error": "Unsupported file type: application/x-msdownload"
      },
      {
        "fileName": "too-large-file.jpg",
        "error": "File size too large. Maximum size for images is 10MB"
      }
    ]
  }
}
```

## 4. Base64 Upload Errors

### Invalid Base64 Format
```bash
curl -X POST "${BASE_URL}/api/file-upload/base64" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "name": "test.jpg",
        "data": "invalid-base64-data"
      }
    ]
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully uploaded 0 file(s)",
  "data": {
    "files": [],
    "urls": [],
    "summary": {
      "total": 1,
      "successful": 0,
      "failed": 1
    },
    "errors": [
      {
        "index": 0,
        "error": "Invalid base64 format"
      }
    ]
  }
}
```

### Missing Files Array
```bash
curl -X POST "${BASE_URL}/api/file-upload/base64" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400):**
```json
{
  "success": false,
  "message": "Please provide an array of base64 files"
}
```

## 5. Delete File Errors

### Missing URL
```bash
curl -X DELETE "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400):**
```json
{
  "success": false,
  "message": "File URL is required"
}
```

### File Not Found or S3 Error
```bash
curl -X DELETE "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-bucket.s3.ap-south-1.amazonaws.com/non-existent-file.jpg"
  }'
```

**Response (500):**
```json
{
  "success": false,
  "message": "The specified key does not exist."
}
```

---

# Quick Test Commands

## Test Valid Upload
```bash
# Create a test image file
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test.png

# Upload it
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@test.png"
```

## Test Configuration
```bash
curl -X GET "${BASE_URL}/api/file-upload/config" | jq
```

## Test with Invalid File
```bash
# Create invalid file
echo "This is not an image" > invalid.txt

# Try to upload
curl -X POST "${BASE_URL}/api/file-upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@invalid.txt"
``` 