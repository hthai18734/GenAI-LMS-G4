const multer = require('multer');
const ServiceError = require('../../service/common/ServiceError');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('document');
module.exports = (req, res, next) =>
  upload(req, res, (error) => {
    if (error)
      return next(
        new ServiceError(
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Tài liệu không được vượt quá 10 MB.'
            : 'Yêu cầu tải tài liệu không hợp lệ.',
        ),
      );
    return next();
  });
