function toApplicationValue(value) {
  if (Array.isArray(value)) return value.map(toApplicationValue);
  if (value && typeof value.toObject === 'function') {
    return toApplicationValue(value.toObject());
  }
  if (value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    let changed = false;
    const entries = Object.entries(value).map(([key, entry]) => {
      const converted = toApplicationValue(entry);
      if (converted !== entry) changed = true;
      return [key, converted];
    });
    return changed ? Object.fromEntries(entries) : value;
  }
  return value;
}

module.exports = function toApplicationRepository(repository) {
  return new Proxy(repository, {
    get(target, property) {
      const member = Reflect.get(target, property, target);
      if (typeof member !== 'function') return member;
      return (...args) => {
        const result = member.apply(target, args);
        return result && typeof result.then === 'function'
          ? result.then(toApplicationValue)
          : toApplicationValue(result);
      };
    },
  });
};
