// Direct translation of VoucherController.validateVoucherInput. Invalid dates in Java parseDate return null.
function parseDate(v) {
  if (!v || !String(v).trim()) return null;
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(`${s}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  const test = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return test === s ? d : null;
}
function numberField(raw, error) {
  if (raw === undefined || raw === null || String(raw).trim() === "")
    return { value: null };
  const n = Number(raw);
  return Number.isFinite(n) ? { value: n } : { error };
}
function validateVoucherInput(body, isCreate, now = new Date()) {
  if (body.code == null || !String(body.code).trim())
    return { error: "Mã voucher không được để trống." };
  const code = String(body.code).trim().toUpperCase();
  const disc = numberField(
    body.discountPercent,
    "Giá trị giảm giá không hợp lệ.",
  );
  if (disc.error || disc.value === null)
    return { error: "Giá trị giảm giá không hợp lệ." };
  if (disc.value <= 0 || disc.value > 100)
    return { error: "Giảm giá phải lớn hơn 0 và không vượt quá 100%." };
  const quantity = numberField(body.quantity, "Số lượng không hợp lệ.");
  if (
    quantity.error ||
    (quantity.value !== null && !Number.isInteger(quantity.value))
  )
    return { error: "Số lượng không hợp lệ." };
  if (quantity.value !== null && quantity.value <= 0)
    return { error: "Số lượng phải lớn hơn 0. Để trống nếu không giới hạn." };
  const min = numberField(
    body.minOrderValue,
    "Giá trị đơn hàng tối thiểu không hợp lệ.",
  );
  if (min.error) return { error: min.error };
  if (min.value !== null && min.value < 0)
    return { error: "Đơn hàng tối thiểu không được âm." };
  const max = numberField(
    body.maxDiscountValue,
    "Giá trị giảm tối đa không hợp lệ.",
  );
  if (max.error) return { error: max.error };
  if (max.value !== null && max.value <= 0)
    return {
      error: "Số tiền giảm tối đa phải lớn hơn 0. Để trống nếu không giới hạn.",
    };
  const start = parseDate(body.startDate),
    end = parseDate(body.endDate);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  if (isCreate && start && start < parseDate(day))
    return { error: "Ngày bắt đầu không được là ngày trong quá khứ." };
  if (start && end && start >= end)
    return { error: "Ngày bắt đầu phải trước ngày kết thúc." };
  const status = isCreate
    ? "active"
    : ["active", "inactive"].includes(body.status)
      ? body.status
      : body.statusToggle === "on"
        ? "active"
        : "inactive";
  return {
    value: {
      code,
      discount_percent: disc.value,
      quantity: quantity.value,
      start_date: start,
      end_date: end,
      status,
      min_order_value: min.value,
      max_discount_value: max.value,
    },
  };
}

module.exports = { parseDate, validateVoucherInput };
