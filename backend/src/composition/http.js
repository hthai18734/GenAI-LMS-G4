const repositories = require('./repositories');
const services = require('./services');
const { createAuthFilter, RoleFilter } = require('../filter/AuthFilter');
const fs = require('fs');
const path = require('path');

const controllers = {};
const controllerRoot = path.resolve(__dirname, '../controller');
for (const group of fs.readdirSync(controllerRoot, { withFileTypes: true })) {
  if (!group.isDirectory() || group.name === 'common') continue;
  const directory = path.join(controllerRoot, group.name);
  for (const file of fs.readdirSync(directory)) {
    if (!file.endsWith('Controller.js')) continue;
    const name = path.basename(file, '.js');
    controllers[name] = require(path.join(directory, file))(services);
  }
}

const AuthFilter = createAuthFilter({
  userRepository: repositories.userRepository,
  refreshSessionRepository: repositories.refreshSessionRepository,
});

module.exports = Object.freeze({ AuthFilter, RoleFilter, controllers: Object.freeze(controllers) });
