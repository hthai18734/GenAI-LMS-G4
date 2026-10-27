const { USER_ROLES } = require('../../domain/identity/UserPolicy');
const PasswordUtil = require('../../utils/auth/PasswordUtil');
const { text, hasOwn, unknownFields, isObjectPayload } = require('../common/DTOUtil');

class UserWriteDTO {
  constructor(body = {}, creating = false) {
    this.payloadIsObject = isObjectPayload(body);
    this.body = this.payloadIsObject ? body : {};
    this.creating = creating;
  }
  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Request body must be an object.';
    const allowed = this.creating ? ['fullName', 'email', 'phone', 'password', 'role'] : ['fullName', 'email', 'phone'];
    const unknown = unknownFields(this.body, allowed);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Object.keys(this.body).length) errors.payload = 'At least one editable field is required.';
    if (this.creating || hasOwn(this.body, 'fullName')) {
      const name = text(this.body.fullName);
      if (name.length < 2 || name.length > 50 || name.split(/\s+/).length < 2 || !/^[\p{L}\s]+$/u.test(name)) errors.fullName = 'Enter a full name with at least two words, 2–50 characters and letters only.';
    }
    if (this.creating || hasOwn(this.body, 'email')) {
      if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-zA-Z]{2,}$/.test(text(this.body.email))) errors.email = 'Invalid email format.';
    }
    if (hasOwn(this.body, 'phone') && this.body.phone !== null && (typeof this.body.phone !== 'string' || (text(this.body.phone) && !/^(0[35789])\d{8}$/.test(text(this.body.phone))))) errors.phone = 'Invalid phone number format.';
    if (this.creating) {
      const passwordError = PasswordUtil.validate(this.body.password);
      if (passwordError) errors.password = passwordError;
      if (hasOwn(this.body, 'role') && !USER_ROLES.includes(this.body.role)) errors.role = 'Invalid user role.';
    }
    return errors;
  }
  toObject() {
    const data = {};
    for (const field of ['fullName', 'email', 'phone']) {
      if (hasOwn(this.body, field)) data[field] = field === 'phone' ? text(this.body[field]) || null : text(this.body[field]);
    }
    if (data.email) data.email = data.email.toLowerCase();
    if (this.creating) data.role = this.body.role || 'student';
    return data;
  }
}
module.exports = UserWriteDTO;
