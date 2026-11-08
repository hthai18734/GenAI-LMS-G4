/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: UC-4.3 View Dashboard
 */

class DashboardQueryDTO {
  constructor({ userId = null } = {}) {
    this.userId = userId;
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
