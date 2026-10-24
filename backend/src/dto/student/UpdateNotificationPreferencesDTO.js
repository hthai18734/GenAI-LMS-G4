const { unknownFields } = require('../common/DTOUtil');
const NotificationPreference = require('../../model/learning/NotificationPreference');

class UpdateNotificationPreferencesDTO {
  constructor(body = {}) {
    this.body = body;
    this.preferences = body.preferences;
  }

  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['preferences']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;

    if (!Array.isArray(this.preferences) || this.preferences.length === 0) {
      errors.preferences = 'Preferences array is required.';
      return errors;
    }

    for (let i = 0; i < this.preferences.length; i++) {
      const pref = this.preferences[i];
      if (!pref.type || typeof pref.enabled !== 'boolean') {
        errors[`preferences[${i}]`] = 'Each preference must have a type and enabled (boolean) field.';
      } else if (!NotificationPreference.NOTIFICATION_TYPES.includes(pref.type)) {
        errors[`preferences[${i}].type`] = `Unsupported notification type: ${pref.type}`;
      }
    }

    return errors;
  }

  toObject() {
    return {
      preferences: (this.preferences || []).map((p) => ({
        type: p.type,
        enabled: p.enabled,
      })),
    };
  }
}

module.exports = UpdateNotificationPreferencesDTO;
