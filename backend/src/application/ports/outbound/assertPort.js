module.exports = function assertPort(name, adapter, requiredMethods) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(`${name} adapter must be an object.`);
  }
  const missing = requiredMethods.filter(method => typeof adapter[method] !== 'function');
  if (missing.length) {
    throw new TypeError(`${name} adapter is missing: ${missing.join(', ')}.`);
  }
  return adapter;
};
