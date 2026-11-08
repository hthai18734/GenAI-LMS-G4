const mongoose = require('mongoose');
module.exports = new mongoose.Schema({
  storageKey: { type: String, required: true },
  name: { type: String, required: true, maxlength: 200 },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true, min: 1, max: 25 * 1024 * 1024 },
}, { _id: false });
