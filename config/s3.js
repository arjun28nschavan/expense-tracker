// config/s3.js
// Handles uploading bill images to AWS S3.
// The EC2 instance uses an IAM Role — so NO access keys needed in this file.
// AWS SDK automatically picks up the IAM Role credentials from EC2 metadata.

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Create the S3 client.
// When running on EC2 with an IAM Role attached, no credentials are needed here —
// the SDK fetches them automatically from the EC2 instance metadata endpoint.
// When running LOCALLY, it will use your ~/.aws/credentials file or env vars.
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // NO credentials here — IAM Role handles this on EC2
  // For local dev: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env
});

// Multer-S3 streams uploaded files directly to S3 (no temp file on disk)
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,  // Your S3 bucket name from .env
    
    // // Make uploaded files publicly readable (so you can display bill images in the UI)
    // acl: 'public-read',
    
    // Set the correct Content-Type header so browsers render images correctly
    contentType: multerS3.AUTO_CONTENT_TYPE,
    
    // Generate a unique filename for each upload to avoid overwrites
    key: function (req, file, cb) {
      const uniqueName = `bills/${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  
  // Only allow image files
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) and PDFs are allowed'));
    }
  },
});

// Helper to delete a file from S3 (used when deleting an expense)
async function deleteFromS3(fileUrl) {
  if (!fileUrl) return; // No file to delete
  
  try {
    // Extract the S3 key from the full URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/bills/uuid.jpg
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash
    
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    }));
    console.log(`Deleted from S3: ${key}`);
  } catch (err) {
    console.error('Failed to delete from S3:', err.message);
    // Don't throw — a failed S3 delete shouldn't break the expense deletion
  }
}

module.exports = { upload, deleteFromS3, s3Client };