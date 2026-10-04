/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: UC-4.6 Get Notification Preferences
 */

class NotificationPreferencesQueryDTO {
  constructor({ user = {} } = {}) {
    this.userId = user._id || null;
  }

  validate() {
    const errors = {};
    if (!this.userId) {
      errors.userId = 'User ID is required.';
    }
    return errors;
  }

  toObject() {
    return { userId: this.userId };
  }
}

module.exports = NotificationPreferencesQueryDTO;
