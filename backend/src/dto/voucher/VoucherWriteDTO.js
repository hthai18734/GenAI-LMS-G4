// Boundary validation for voucher create/update requests. Invalid dates in the
// legacy Java implementation map to null, so that behavior is preserved.
function parseDate(value) {
  if (!value || !String(value).trim()) return null;
  const source = String(value).trim();
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(source)) return null;
  const date = new Date(`${source}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  const normalized = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
  return normalized === source ? date : null;
}

function numberField(raw, error) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { value: null };
  if (typeof raw === 'boolean' || typeof raw === 'object') return { error };
  const value = Number(raw);
  return Number.isFinite(value) ? { value } : { error };
}

function validateVoucherInput(body, isCreate, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Unsupported voucher field.' };
  if (body.code == null || !String(body.code).trim()) return { error: 'Voucher code is required.' };
  const code = String(body.code).trim().toUpperCase();
  const discount = numberField(body.discountPercent, 'Discount percentage is invalid.');
  if (discount.error || discount.value === null) return { error: 'Discount percentage is invalid.' };
  if (discount.value <= 0 || discount.value > 100) return { error: 'Discount percentage must be greater than 0 and no more than 100.' };
  const quantity = numberField(body.quantity, 'Quantity is invalid.');
  if (quantity.error || (quantity.value !== null && !Number.isInteger(quantity.value))) return { error: 'Quantity is invalid.' };
  if (quantity.value !== null && quantity.value <= 0) return { error: 'Quantity must be greater than 0. Leave it blank for unlimited use.' };
  const minimum = numberField(body.minOrderValue, 'Minimum order value is invalid.');
  if (minimum.error) return { error: minimum.error };
  if (minimum.value !== null && minimum.value < 0) return { error: 'Minimum order value cannot be negative.' };
  const maximum = numberField(body.maxDiscountValue, 'Maximum discount value is invalid.');
  if (maximum.error) return { error: maximum.error };
  if (maximum.value !== null && maximum.value <= 0) return { error: 'Maximum discount value must be greater than 0. Leave it blank for no limit.' };
  const start = parseDate(body.startDate);
  const end = parseDate(body.endDate);
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  if (isCreate && start && start < parseDate(localDay)) return { error: 'Start date cannot be in the past.' };
  if (start && end && start >= end) return { error: 'Start date must be before end date.' };
  const status = isCreate
    ? 'active'
    : ['active', 'inactive'].includes(body.status)
      ? body.status
      : body.statusToggle === 'on' ? 'active' : 'inactive';
  return {
    value: {
      code,
      discount_percent: discount.value,
      quantity: quantity.value,
      start_date: start,
      end_date: end,
      status,
      min_order_value: minimum.value,
      max_discount_value: maximum.value,
    },
  };
}

module.exports = { parseDate, validateVoucherInput };
