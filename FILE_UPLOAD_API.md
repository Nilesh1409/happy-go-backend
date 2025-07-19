# Robust File Upload API

## Overview
A single, production-ready file upload system that supports multiple file types, automatic compression, validation, and direct S3 upload with security features.

## Features
- ✅ **Multi-format support**: Images, Documents, Videos
- ✅ **Automatic image compression**: Reduces file sizes while maintaining quality
- ✅ **Direct S3 upload**: No local storage required
- ✅ **File validation**: Type, size, and format validation
- ✅ **Error handling**: Detailed error messages and graceful failures
- ✅ **Security**: Authentication required, file type restrictions
- ✅ **Production ready**: Robust error handling and logging

## Supported File Types

### Images (Max: 10MB)
- JPEG, JPG, PNG, WebP, GIF
- Auto-compression enabled
- Max resolution: 1920x1080

### Documents (Max: 20MB)
- PDF, DOC, DOCX
- No compression

### Videos (Max: 100MB)
- MP4, WebM, MOV
- No compression

## API Endpoints

### 1. Get Upload Configuration
```http
GET /api/file-upload/config
```
**Public endpoint** - Returns supported formats and limits.

**Response:**
```json
{
  "success": true,
  "data": {
    "maxFiles": 10,
    "categories": {
      "images": {
        "allowedTypes": ["image/jpeg", "image/png", ...],
        "maxSize": 10485760,
        "maxSizeMB": 10,
        "folder": "images",
        "compressionEnabled": true
      }
    }
  }
}
```

### 2. Upload Files (Multipart)
```http
POST /api/file-upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `files`: File array (max 10 files)
- `folder`: Optional custom folder name

**Example using curl:**
```bash
curl -X POST "http://localhost:5000/api/file-upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@photo1.jpg" \
  -F "files=@document.pdf" \
  -F "folder=my-custom-folder"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully uploaded 2 file(s)",
  "data": {
    "files": [
      {
        "originalName": "photo1.jpg",
        "fileName": "uuid-123.jpg",
        "mimetype": "image/jpeg",
        "size": 2048576,
        "compressedSize": 1024768,
        "category": "images",
        "folder": "my-custom-folder",
        "url": "https://bucket.s3.region.amazonaws.com/my-custom-folder/uuid-123.jpg",
        "compressed": true
      }
    ],
    "urls": ["https://bucket.s3.region.amazonaws.com/..."],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "totalSize": 4096000,
      "compressedSize": 2048000
    }
  }
}
```

### 3. Upload Base64 Files
```http
POST /api/file-upload/base64
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "files": [
    {
      "name": "photo.jpg",
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    }
  ],
  "folder": "uploads"
}
```

### 4. Delete File
```http
DELETE /api/file-upload
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://bucket.s3.region.amazonaws.com/folder/file.jpg"
}
```

## Frontend Integration Examples

### JavaScript/Fetch
```javascript
// Upload multiple files
async function uploadFiles(files) {
  const formData = new FormData();
  
  // Add files
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Optional custom folder
  formData.append('folder', 'user-uploads');
  
  const response = await fetch('/api/file-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Uploaded URLs:', result.data.urls);
  }
}
```

### React Example
```jsx
import React, { useState } from 'react';

function FileUpload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const response = await fetch('/api/file-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUploadedUrls(result.data.urls);
        alert(`Successfully uploaded ${result.data.summary.successful} files`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept="image/*,application/pdf,.doc,.docx,video/*"
        onChange={handleFileSelect}
      />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Files'}
      </button>
      
      {uploadedUrls.length > 0 && (
        <div>
          <h3>Uploaded Files:</h3>
          {uploadedUrls.map((url, index) => (
            <div key={index}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Error Handling

### Common Error Codes
- `FILE_TOO_LARGE`: File exceeds size limit
- `TOO_MANY_FILES`: More than 10 files uploaded
- `UNSUPPORTED_FILE_TYPE`: File type not allowed
- `UNEXPECTED_FIELD`: Wrong form field name (use "files")

### Error Response Format
```json
{
  "success": false,
  "message": "File too large. Maximum file size is 10MB.",
  "error": "FILE_TOO_LARGE"
}
```

## Security Features
- Authentication required for upload/delete
- File type validation
- File size limits
- Unique filenames (UUID)
- No executable file uploads
- Direct S3 upload (no local storage)

## Production Considerations

### Environment Variables Required
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name
```

### S3 Bucket Configuration
- Enable CORS for web uploads
- Set appropriate bucket policies
- Configure lifecycle rules for cost optimization

### Performance
- Image compression reduces bandwidth
- Direct S3 upload eliminates server storage
- Parallel processing for multiple files
- Memory-efficient streaming

## Migration from Old System

If you're migrating from the old upload systems, replace:

**Old:**
```javascript
// From: /api/upload/files or /api/simple-upload/files
```

**New:**
```javascript
// To: /api/file-upload
```

The new system provides:
- Better error handling
- Image compression
- Consistent response format
- Enhanced security
- Production-ready features

## Testing

Test the API with various file types and sizes to ensure it meets your requirements:

```bash
# Test image upload
curl -X POST "http://localhost:5000/api/file-upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-image.jpg"

# Test configuration endpoint
curl -X GET "http://localhost:5000/api/file-upload/config"
``` 