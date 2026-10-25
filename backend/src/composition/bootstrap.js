const Voucher = require('../model/voucher/Voucher');
const VoucherRedemption = require('../model/voucher/VoucherRedemption');
const Review = require('../model/engagement/Review');
const PasswordUtil = require('../utils/auth/PasswordUtil');
const LoggerUtil = require('../utils/common/LoggerUtil');
const repositories = require('./repositories');

const DEFAULT_CATEGORIES = [
  ['Artificial Intelligence', 'Machine learning, neural networks and LLMs'],
  ['Web Development', 'Modern frontend and backend frameworks'],
  ['Data Science', 'Data analysis, statistics, and visualization'],
  ['Cloud Computing', 'DevOps, Docker, Kubernetes and microservices'],
];

async function initializePersistence() {
  await Promise.all([Voucher.init(), VoucherRedemption.init(), Review.init()]);
  await repositories.reviewRepository.repairPendingRatings();
  const timer = setInterval(() => {
    repositories.reviewRepository.repairPendingRatings()
      .catch(error => LoggerUtil.error('Review rating repair failed', error));
  }, 60000);
  timer.unref();
}

async function seedDevelopmentData(env = process.env) {
  if (env.NODE_ENV === 'production' || env.ENABLE_DEVELOPMENT_SEED !== 'true') return;

  const accounts = [
    { email: env.DEV_SEED_ADMIN_EMAIL, password: env.DEV_SEED_ADMIN_PASSWORD, fullName: 'Development Admin', role: 'admin' },
    { email: env.DEV_SEED_TEACHER_EMAIL, password: env.DEV_SEED_TEACHER_PASSWORD, fullName: 'Development Teacher', role: 'teacher', phone: '0987654321' },
  ].filter(account => account.email && account.password);

  for (const account of accounts) {
    const email = account.email.trim().toLowerCase();
    if (!await repositories.userRepository.isEmailExists(email)) {
      await repositories.userRepository.createUser({
        fullName: account.fullName,
        email,
        phone: account.phone,
        passwordHash: await PasswordUtil.hash(account.password),
        role: account.role,
        status: 'active',
        emailVerifiedAt: new Date(),
      });
      LoggerUtil.info(`Development ${account.role} account seeded.`);
    }
  }

  if (await repositories.categoryRepository.countActiveRecords() === 0) {
    for (const [name, description] of DEFAULT_CATEGORIES) {
      await repositories.categoryRepository.create({
        name,
        normalizedName: name.toLowerCase(),
        description,
        isActive: true,
      });
    }
    LoggerUtil.info('Development categories seeded.');
  }
}

module.exports = { initializePersistence, seedDevelopmentData };
