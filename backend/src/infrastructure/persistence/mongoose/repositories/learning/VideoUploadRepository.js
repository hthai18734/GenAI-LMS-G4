const VideoUpload = require('../../../../../model/learning/VideoUpload');
module.exports = {
  create: data => VideoUpload.create(data), find: filename => VideoUpload.findOne({ filename }).lean(),
  expired: () => VideoUpload.find({ expiresAt: { $lte: new Date() } }).limit(100).lean(),
  remove: filename => VideoUpload.deleteOne({ filename }),
};
