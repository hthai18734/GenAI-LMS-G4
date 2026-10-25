const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasOwn(body, field) {
  return Object.prototype.hasOwnProperty.call(body || {}, field);
}

function objectId(value) {
  return !value || isValidIdentifier(value);
}

function unknownFields(body, allowed) {
  return Object.keys(body || {}).filter((key) => !allowed.includes(key));
}

module.exports = { text, hasOwn, objectId, unknownFields };
