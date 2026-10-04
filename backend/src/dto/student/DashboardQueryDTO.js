class DashboardQueryDTO {
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

module.exports = DashboardQueryDTO;
