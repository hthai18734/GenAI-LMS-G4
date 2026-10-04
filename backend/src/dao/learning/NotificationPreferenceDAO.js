const mongoose = require('mongoose');
const NotificationPreference = require('../../model/learning/NotificationPreference');

class NotificationPreferenceDAO {
  async findByUserId(userId) {
    if (!mongoose.isValidObjectId(userId)) return [];
    return NotificationPreference.find({ userId }).sort({ type: 1 }).exec();
  }

  async upsertPreference(userId, type, enabled) {
    return NotificationPreference.findOneAndUpdate(
      { userId, type },
      { userId, type, enabled },
      { upsert: true, new: true, runValidators: true },
    ).exec();
  }

  async upsertMany(userId, preferences) {
    const operations = preferences.map(({ type, enabled }) => ({
      updateOne: {
        filter: { userId, type },
        update: { userId, type, enabled },
        upsert: true,
      },
    }));
    await NotificationPreference.bulkWrite(operations);
    return this.findByUserId(userId);
  }

  async isEnabled(userId, type) {
    if (!mongoose.isValidObjectId(userId)) return true;
    const pref = await NotificationPreference.findOne({ userId, type }).exec();
    return pref ? pref.enabled : true;
  }
}

module.exports = new NotificationPreferenceDAO();
