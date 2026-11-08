const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const types = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const root = path.resolve(__dirname, '../../../uploads/assignment-documents');
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) { fs.mkdirSync(root, { recursive: true }); cb(null, root); },
    filename(req, file, cb) { cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`); },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 2, fieldSize: 100000 },
  fileFilter(req, file, cb) {
    const mime = types[path.extname(file.originalname).toLowerCase()];
    if (!mime || ![mime, 'application/octet-stream'].includes(file.mimetype)) return cb(Object.assign(new Error('Choose a PDF, DOC or DOCX file (maximum 25 MB).'), { status: 400 }));
    file.mimetype = mime; cb(null, true);
  },
}).single('file');
module.exports = { uploadAssignmentDocument: upload };
