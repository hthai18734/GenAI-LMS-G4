const mongoose = require('mongoose');
const LoggerUtil = require('../common/LoggerUtil');

class MongoDBUtil {
  static async connect(uri = process.env.MONGODB_URI) {
    if (!uri) throw new Error('MONGODB_URI is required.');
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    LoggerUtil.info('MongoDB connected');
    return mongoose.connection;
  }

  static async disconnect() {
    await mongoose.disconnect();
  }
}

module.exports = MongoDBUtil;
