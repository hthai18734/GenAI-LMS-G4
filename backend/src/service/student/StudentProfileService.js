const ServiceError = require('../common/ServiceError');

function publicProfile(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    teachingStatus: user.teachingStatus || 'active',
    avatar: user.avatar,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

class StudentProfileService {
  constructor({ userRepository } = {}) {
    this.userRepository = userRepository;
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new ServiceError(404, 'Profile not found.');
    return { profile: publicProfile(user) };
  }

  async updateProfile(userId, updates) {
    try {
      const user = await this.userRepository.updateProfile(userId, updates);
      if (!user) throw new ServiceError(404, 'Profile not found.');
      return { profile: publicProfile(user) };
    } catch (error) {
      if (error.code === 11000) throw new ServiceError(409, 'This email is already in use.');
      throw error;
    }
  }

  toPublicProfile(user) {
    return publicProfile(user);
  }
}

module.exports = StudentProfileService;
