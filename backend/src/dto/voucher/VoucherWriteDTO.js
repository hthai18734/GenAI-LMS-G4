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
  if (body.code == null || !String(body.code).trim()) return { error: 'MÃ£ voucher khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.' };
  const code = String(body.code).trim().toUpperCase();
  const discount = numberField(body.discountPercent, 'GiÃ¡ trá»‹ giáº£m giÃ¡ khÃ´ng há»£p lá»‡.');
  if (discount.error || discount.value === null) return { error: 'GiÃ¡ trá»‹ giáº£m giÃ¡ khÃ´ng há»£p lá»‡.' };
  if (discount.value <= 0 || discount.value > 100) return { error: 'Giáº£m giÃ¡ pháº£i lá»›n hÆ¡n 0 vÃ  khÃ´ng vÆ°á»£t quÃ¡ 100%.' };
  const quantity = numberField(body.quantity, 'Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡.');
  if (quantity.error || (quantity.value !== null && !Number.isInteger(quantity.value))) return { error: 'Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡.' };
  if (quantity.value !== null && quantity.value <= 0) return { error: 'Sá»‘ lÆ°á»£ng pháº£i lá»›n hÆ¡n 0. Äá»ƒ trá»‘ng náº¿u khÃ´ng giá»›i háº¡n.' };
  const minimum = numberField(body.minOrderValue, 'GiÃ¡ trá»‹ Ä‘Æ¡n hÃ ng tá»‘i thiá»ƒu khÃ´ng há»£p lá»‡.');
  if (minimum.error) return { error: minimum.error };
  if (minimum.value !== null && minimum.value < 0) return { error: 'ÄÆ¡n hÃ ng tá»‘i thiá»ƒu khÃ´ng Ä‘Æ°á»£c Ã¢m.' };
  const maximum = numberField(body.maxDiscountValue, 'GiÃ¡ trá»‹ giáº£m tá»‘i Ä‘a khÃ´ng há»£p lá»‡.');
  if (maximum.error) return { error: maximum.error };
  if (maximum.value !== null && maximum.value <= 0) return { error: 'Sá»‘ tiá»n giáº£m tá»‘i Ä‘a pháº£i lá»›n hÆ¡n 0. Äá»ƒ trá»‘ng náº¿u khÃ´ng giá»›i háº¡n.' };
  const start = parseDate(body.startDate);
  const end = parseDate(body.endDate);
  const localDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  if (isCreate && start && start < parseDate(localDay)) return { error: 'NgÃ y báº¯t Ä‘áº§u khÃ´ng Ä‘Æ°á»£c lÃ  ngÃ y trong quÃ¡ khá»©.' };
  if (start && end && start >= end) return { error: 'NgÃ y báº¯t Ä‘áº§u pháº£i trÆ°á»›c ngÃ y káº¿t thÃºc.' };
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
