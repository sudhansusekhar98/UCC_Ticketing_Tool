import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Detect if running in Vercel (serverless environment)
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// For local development, use disk storage with uploads folder
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = 'uploads/';
    // Only create directory if not on Vercel
    if (!isVercel && !fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// For Vercel, use memory storage
const memoryStorage = multer.memoryStorage();

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images, documents, and spreadsheets are allowed'));
};

// Create multer instance based on environment
const createUploader = (options = {}) => {
  const { limits = { fileSize: 10 * 1024 * 1024 } } = options; // Default 10MB
  
  return multer({
    storage: isVercel ? memoryStorage : diskStorage,
    limits,
    fileFilter
  });
};

// Default upload instance
const upload = createUploader();

// Simple upload (for bulk import) - just uses memory storage on Vercel
const simpleUpload = multer({
  storage: isVercel ? memoryStorage : multer.diskStorage({ dest: 'uploads/' }),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB for bulk imports
});

export { upload, simpleUpload, createUploader, isVercel };
export default upload;
