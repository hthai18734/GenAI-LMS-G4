const { text, hasOwn, unknownFields } = require('../common/DTOUtil');

class UpdateProfileDTO {
  constructor(body = {}) {
    this.body = body;
  }

  validate() {
    const errors = {};
    const allowed = ['fullName', 'phone', 'avatar'];
    const unknown = unknownFields(this.body, allowed);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Object.keys(this.body).some((k) => allowed.includes(k))) errors.payload = 'At least one editable field is required.';

    // fullName validation (tên ghi gì cũng được, miễn không để trống)
    if (hasOwn(this.body, 'fullName')) {
      const name = text(this.body.fullName);
      if (!name) {
        errors.fullName = 'Full name is required.';
      } else if (name.length > 100) {
        errors.fullName = 'Full name must be under 100 characters.';
      }
    }

    // phone validation (10 số bắt đầu bằng số 0)
    if (hasOwn(this.body, 'phone')) {
      const rawPhone = text(this.body.phone);
      if (rawPhone) {
        let cleanPhone = rawPhone.replace(/[\s.-]/g, '');
        if (cleanPhone.startsWith('+84')) cleanPhone = '0' + cleanPhone.slice(3);
        else if (cleanPhone.startsWith('84') && cleanPhone.length === 11) cleanPhone = '0' + cleanPhone.slice(2);

        if (!/^0\d{9}$/.test(cleanPhone)) {
          errors.phone = 'Phone number must be exactly 10 digits starting with 0.';
        }
      }
    }

    // avatar validation
    if (hasOwn(this.body, 'avatar') && this.body.avatar) {
      const avatar = this.body.avatar;
      const isDataUri = typeof avatar === 'string' && avatar.startsWith('data:image/');
      const isUrl = typeof avatar === 'string' && /^(https?:\/\/|\/|blob:)/.test(avatar);
      if (!isDataUri && !isUrl) {
        errors.avatar = 'Invalid avatar format. Please upload a valid image.';
      } else if (isDataUri) {
        const allowedMimes = ['data:image/jpeg', 'data:image/png', 'data:image/webp'];
        if (!allowedMimes.some((mime) => avatar.startsWith(mime))) {
          errors.avatar = 'Avatar must be JPEG, PNG, or WebP.';
        } else {
          const base64Part = avatar.split(',')[1] || '';
          const approxBytes = Math.ceil(base64Part.length * 0.75);
          if (approxBytes > 5 * 1024 * 1024) {
            errors.avatar = 'Avatar must be smaller than 5MB.';
          }
        }
      }
    }

    return errors;
  }

  toObject() {
    const result = {};
    if (hasOwn(this.body, 'fullName')) result.fullName = text(this.body.fullName);
    if (hasOwn(this.body, 'phone')) {
      const raw = text(this.body.phone);
      if (raw) {
        let clean = raw.replace(/[\s.-]/g, '');
        if (clean.startsWith('+84')) clean = '0' + clean.slice(3);
        else if (clean.startsWith('84') && clean.length === 11) clean = '0' + clean.slice(2);
        result.phone = clean;
      } else {
        result.phone = null;
      }
    }
    if (hasOwn(this.body, 'avatar')) result.avatar = this.body.avatar || null;
    return result;
  }
}

module.exports = UpdateProfileDTO;
