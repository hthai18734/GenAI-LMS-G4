const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '../../../uploads/lesson-videos');
const allowedMimeTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
]);

const extensions = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/x-matroska': '.mkv',
};

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    const ext = extensions[file.mimetype] || path.extname(file.originalname) || '.mp4';
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.has(file.mimetype) && !file.mimetype.startsWith('video/')) {
    const error = new Error('Only video formats are supported (MP4, WebM, OGG, MOV).');
    error.status = 400;
    return callback(error);
  }
  return callback(null, true);
};

const uploadLessonVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024, files: 1 }, // 200 MB
}).single('video');

module.exports = { uploadLessonVideo };
