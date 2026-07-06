import multer from 'multer';
import path from 'path';

// Memory storage - files go directly to Cloudinary without touching disk
const memoryStorage = multer.memoryStorage();

// File filter - require BOTH extension AND mimetype to match
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv|mp4|mov|avi|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only images, videos, documents, and spreadsheets are allowed'));
};

// Import-specific filter - only spreadsheet formats
const importFileFilter = (req, file, cb) => {
  const allowedTypes = /xls|xlsx|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /spreadsheet|csv|excel/.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
};

const createUploader = (options = {}) => {
  const { limits = { fileSize: 50 * 1024 * 1024 } } = options;

  return multer({
    storage: memoryStorage,
    limits,
    fileFilter
  });
};

const upload = createUploader();

const simpleUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: importFileFilter
});

export { upload, simpleUpload, createUploader };
export default upload;
