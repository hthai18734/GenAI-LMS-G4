const { text } = require('../common/DTOUtil');

class CreateManagedUserDTO {
  constructor(body = {}) {
    this.fullName = text(body.fullName);
    this.email = text(body.email)?.toLowerCase();
    this.password = typeof body.password === 'string' ? body.password : '';
    this.role = text(body.role) || 'teacher';
    this.phone = text(body.phone) || null;
  }

  validate() {
    const errors = {};
    if (!this.fullName || this.fullName.length < 2 || this.fullName.length > 100) errors.fullName = 'Full name must contain 2 to 100 characters.';
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) errors.email = 'A valid email is required.';
    if (this.password.length < 6 || this.password.length > 128) errors.password = 'Password must contain 6 to 128 characters.';
    if (!['student', 'teacher'].includes(this.role)) errors.role = 'Role must be student or teacher.';
    return errors;
  }

  toObject() { return { fullName: this.fullName, email: this.email, password: this.password, role: this.role, phone: this.phone }; }
}

module.exports = CreateManagedUserDTO;
