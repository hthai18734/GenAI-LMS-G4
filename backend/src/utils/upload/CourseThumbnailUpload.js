const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '../../../uploads/course-thumbnails');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    callback(
      null,
      `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extensions[file.mimetype]}`,
    );
  },
});

const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Only JPEG, PNG, and WebP images are supported.');
    error.status = 400;
    return callback(error);
  }
  return callback(null, true);
};

const uploadCourseThumbnail = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('thumbnail');

module.exports = { uploadCourseThumbnail };
