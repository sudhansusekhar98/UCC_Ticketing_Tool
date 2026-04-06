import multer from 'multer';
import path from 'path';

// Memory storage - files go directly to Cloudinary without touching disk
// Works on AWS EB, Vercel, and any environment without filesystem write access
const memoryStorage = multer.memoryStorage();

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv|mp4|mov|avi|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images, videos, documents, and spreadsheets are allowed'));
};

// Create multer instance
const createUploader = (options = {}) => {
  const { limits = { fileSize: 50 * 1024 * 1024 } } = options; // Default 50MB (supports video uploads)

  return multer({
    storage: memoryStorage,
    limits,
    fileFilter
  });
};

// Default upload instance
const upload = createUploader();

// Simple upload (for bulk import)
const simpleUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB for bulk imports
});

export { upload, simpleUpload, createUploader };
export default upload;
