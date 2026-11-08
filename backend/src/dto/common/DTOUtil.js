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

function isObjectPayload(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function strictNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function strictInteger(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = strictNumber(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

module.exports = { text, hasOwn, objectId, unknownFields, isObjectPayload, strictNumber, strictInteger };
