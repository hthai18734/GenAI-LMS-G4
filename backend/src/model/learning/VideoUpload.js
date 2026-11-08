const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true }, ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  mimeType: String, sizeBytes: Number, originalName: String, expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true, versionKey: false });
module.exports = mongoose.models.VideoUpload || mongoose.model('VideoUpload', schema);
