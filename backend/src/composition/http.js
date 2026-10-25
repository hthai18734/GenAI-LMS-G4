const repositories = require('./repositories');
const { createAuthFilter, RoleFilter } = require('../filter/AuthFilter');

const AuthFilter = createAuthFilter({
  userRepository: repositories.userRepository,
  refreshSessionRepository: repositories.refreshSessionRepository,
});

module.exports = Object.freeze({ AuthFilter, RoleFilter });
