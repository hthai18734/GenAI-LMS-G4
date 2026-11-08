const { percentageDiscount, subtractDiscount } = require("../../domain/voucher/VoucherMoney");
function createVoucherService({
  voucherRepository: VoucherRepository,
  voucherRedemptionRepository: VoucherRedemptionRepository,
  courseRepository: CourseRepository,
}) {
const publicDoc = (v) => ({
  voucherID: v._id,
  code: v.code,
  discountPercent: v.discount_percent,
  quantity: v.quantity,
  startDate: v.start_date,
  endDate: v.end_date,
  status: v.status,
  usedCount: v.usedCount || 0,
  isDeleted: v.is_deleted,
  minOrderValue: v.min_order_value,
  maxDiscountValue: v.max_discount_value,
});
async function usedCount(id, session = null) {
  return VoucherRedemptionRepository.countUsed(id, session);
}
async function hasUsed(customerID, id, session = null) {
  return VoucherRedemptionRepository.hasUsed(customerID, id, session);
}
async function autoExpire(now = new Date()) {
  await VoucherRepository.expireBefore(now);
}
async function list(keyword, status, page = 1) {
  await autoExpire();
  const criteria = { keyword: keyword ? String(keyword).trim() : '', status: status || null };
  const count = await VoucherRepository.countList(criteria),
    totalPages = Math.max(1, Math.ceil(count / 10));
  page = Math.min(totalPages, Math.max(1, Number.isInteger(+page) ? +page : 1));
  const docs = await VoucherRepository.findPageByCriteria(criteria, page);
  const vouchers = await Promise.all(
    docs.map(async (v) =>
      publicDoc({ ...v, usedCount: await usedCount(v._id) }),
    ),
  );
  const now = new Date();
  const all = await VoucherRepository.findAllActiveRecords();
  let active = 0;
  for (const v of all) {
    if (
      v.status === "active" &&
      (!v.start_date || v.start_date <= now) &&
      (!v.end_date || v.end_date >= now) &&
      (v.quantity == null || v.quantity > (await usedCount(v._id)))
    )
      active++;
  }
  return {
    vouchers,
    page,
    totalPages,
    totalRecords: count,
    stats: {
      totalVouchers: all.length,
      activeVouchers: active,
      expiredVouchers: all.filter((v) => v.status === "expired").length,
      totalUsed: await VoucherRedemptionRepository.countAllUsed(),
    },
  };
}
async function detail(id) {
  const v = await VoucherRepository.findById(id);
  return v ? publicDoc({ ...v, usedCount: await usedCount(id) }) : null;
}
async function create(input) {
  if (await VoucherRepository.existsCode(input.code))
    return false;
  try {
    await VoucherRepository.create(input);
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}
async function update(id, input) {
  if (
    await VoucherRepository.existsCode(input.code, id)
  )
    return false;
  try {
    return !!(
      await VoucherRepository.update(id, input)
    ).modifiedCount;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}
async function remove(id) {
  // Compare-and-swap against the revision written by every redemption.
  // If redemption commits after the count, this delete retries with fresh usage.
  for (let attempt = 0; attempt < 10; attempt++) {
    const voucher = await VoucherRepository.findById(id, { includeRevision: true });
    if (!voucher) return 0;
    if ((await usedCount(id)) > 0) return -1;
    const revision = voucher.usageRevision;
    const result = await VoucherRepository.softDeleteAtRevision(id, revision);
    if (result.modifiedCount) return 1;
  }
  throw new (require("../common/ServiceError"))(
    409,
    "Voucher is busy. Please retry.",
  );
}
async function toggle(id, status) {
  return !!(
    await VoucherRepository.toggle(id, status)
  ).modifiedCount;
}
async function activeForCustomer(customerID) {
  const now = new Date(),
    vouchers = await VoucherRepository.findCurrentlyActive(now);
  const out = [];
  for (const v of vouchers) {
    const count = await usedCount(v._id);
    if (v.quantity != null && count >= v.quantity) continue;
    if (await hasUsed(customerID, v._id)) continue;
    out.push(publicDoc({ ...v, usedCount: count }));
  }
  return out;
}
// Exact validation ordering from CheckoutController.validateVoucher.
async function validateApply(
  code,
  customerID,
  total,
  now = new Date(),
  session = null,
) {
  if (code == null || !String(code).trim())
    return { success: false, message: "Vui lòng nhập mã voucher." };
  const v = await VoucherRepository.findByCode(String(code).trim().toUpperCase(), session);
  if (!v) return { success: false, message: "Mã voucher không tồn tại." };
  if (v.status !== "active")
    return { success: false, message: "Voucher này không còn khả dụng." };
  if (v.start_date && v.start_date > now)
    return { success: false, message: "Voucher chưa tới thời gian sử dụng." };
  if (v.end_date && v.end_date < now)
    return { success: false, message: "Voucher đã hết hạn." };
  if (v.min_order_value != null && total < v.min_order_value)
    return {
      success: false,
      message: `Đơn hàng chưa đạt giá trị tối thiểu ${Math.round(v.min_order_value).toLocaleString("en-US")}đ để dùng voucher này.`,
    };
  if (v.quantity != null && (await usedCount(v._id, session)) >= v.quantity)
    return { success: false, message: "Voucher đã hết lượt sử dụng." };
  if (await hasUsed(customerID, v._id, session))
    return { success: false, message: "Bạn đã sử dụng voucher này rồi." };
  // Java BigDecimal divide(scale=2, HALF_UP); domain VND values from SQL DECIMAL.
  let discount = percentageDiscount(total, v.discount_percent);
  if (v.max_discount_value != null)
    discount = Math.min(discount, v.max_discount_value);
  discount = Math.min(discount, total);
  return {
    success: true,
    message: "Áp dụng voucher thành công!",
    voucher: publicDoc(v),
    discountAmount: discount,
  };
}

async function history(voucherId, page) {
  return VoucherRedemptionRepository.history(voucherId, page);
}

async function preview(code, customerId, courseId) {
  const course = await CourseRepository.findPublicForCheckout(courseId);
  if (!course) return { error: { status: 404, message: 'Course not found.' } };
  const total = course.price;
  if (!Number.isFinite(total) || total < 0) return { error: { status: 422, message: 'Invalid stored course price.' } };
  const result = await validateApply(code, customerId, total);
  return {
    course,
    total,
    result,
    finalTotal: result.success ? subtractDiscount(total, result.discountAmount) : null,
  };
}

return Object.freeze({
  usedCount,
  hasUsed,
  autoExpire,
  list,
  detail,
  create,
  update,
  remove,
  toggle,
  activeForCustomer,
  validateApply,
  history,
  preview,
});
}

module.exports = createVoucherService;
