const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '../../../uploads/materials');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${safeExt}`);
  },
});

const allowedMimes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

const allowedExtensions = new Set([
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.zip', '.rar', '.7z', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.webp',
  '.mp4', '.webm',
]);

const fileFilter = (req, file, callback) => {
  const ext = (path.extname(file.originalname) || '').toLowerCase();
  const isMimeAllowed = allowedMimes.has(file.mimetype);
  const isExtAllowed = allowedExtensions.has(ext);

  if (!isMimeAllowed && !(file.mimetype === 'application/octet-stream' && isExtAllowed)) {
    const error = new Error('Unsupported material file type. Supported types: PDF, Word, PowerPoint, Excel, Zip, Text, Images, MP4.');
    error.status = 422;
    return callback(error);
  }
  return callback(null, true);
};

const uploadMaterial = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
}).single('file');

module.exports = { uploadMaterial, uploadDirectory };
