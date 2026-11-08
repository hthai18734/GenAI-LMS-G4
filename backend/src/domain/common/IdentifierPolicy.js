const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function isValidIdentifier(value) {
  return typeof value === 'string' || (value && typeof value.toString === 'function')
    ? OBJECT_ID_PATTERN.test(String(value))
    : false;
}

module.exports = { isValidIdentifier };
