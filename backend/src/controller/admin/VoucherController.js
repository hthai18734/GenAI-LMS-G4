const { voucherService: service } = require("../../composition/services");
const {
  validateVoucherInput,
} = require("../../service/voucher/VoucherValidation");
const Response = require("../../utils/common/ResponseUtil");
const { subtractDiscount } = require("../../service/voucher/VoucherMoney");
const fail = (res, message, status = 400) =>
  Response.error(res, { status, message });
const validId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const wrap = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};
const allowed = [
  "code",
  "discountPercent",
  "quantity",
  "startDate",
  "endDate",
  "status",
  "statusToggle",
  "minOrderValue",
  "maxDiscountValue",
];
function input(req, res, creating) {
  if (
    !req.body ||
    Array.isArray(req.body) ||
    Object.keys(req.body).some((k) => !allowed.includes(k))
  ) {
    fail(res, "Unsupported voucher field.");
    return null;
  }
  const parsed = validateVoucherInput(req.body, creating);
  if (parsed.error) {
    fail(res, parsed.error);
    return null;
  }
  return parsed.value;
}
module.exports = {
  list: wrap(async (req, res) => {
    if (
      req.query.status &&
      !["active", "inactive", "expired"].includes(req.query.status)
    )
      return fail(res, "Invalid voucher status.");
    if (req.query.keyword && typeof req.query.keyword !== "string")
      return fail(res, "Invalid keyword.");
    return Response.success(res, {
      data: await service.list(
        req.query.keyword?.trim(),
        req.query.status,
        req.query.page,
      ),
    });
  }),
  detail: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher không hợp lệ.");
    const voucher = await service.detail(req.params.id);
    return voucher
      ? Response.success(res, { data: { voucher } })
      : fail(res, "Voucher không tồn tại.", 404);
  }),
  create: wrap(async (req, res) => {
    const data = input(req, res, true);
    if (!data) return;
    return (await service.create(data))
      ? Response.success(res, {
          status: 201,
          message: "Thêm voucher " + data.code + " thành công!",
        })
      : fail(res, "Thêm voucher thất bại. Mã code có thể đã tồn tại.");
  }),
  update: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher không hợp lệ.");
    const data = input(req, res, false);
    if (!data) return;
    return (await service.update(req.params.id, data))
      ? Response.success(res, { message: "Cập nhật voucher thành công!" })
      : fail(
          res,
          "Cập nhật thất bại. Mã code có thể đã tồn tại hoặc voucher không còn tồn tại.",
        );
  }),
  remove: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher không hợp lệ.");
    const r = await service.remove(req.params.id);
    return r === 1
      ? Response.success(res, { message: "Xóa voucher thành công!" })
      : fail(
          res,
          r === -1
            ? "Không thể xóa voucher đã được khách hàng sử dụng."
            : "Xóa voucher thất bại.",
        );
  }),
  toggle: wrap(async (req, res) => {
    if (
      !validId(req.params.id) ||
      !req.body ||
      Object.keys(req.body).some((k) => k !== "newStatus") ||
      !["active", "inactive"].includes(req.body.newStatus)
    )
      return fail(res, "Yêu cầu không hợp lệ.");
    if (!(await service.toggle(req.params.id, req.body.newStatus)))
      return fail(res, "Thao tác thất bại. Voucher có thể đã expired.");
    return Response.success(res, {
      message:
        req.body.newStatus === "active"
          ? "Đã kích hoạt voucher."
          : "Đã vô hiệu hóa voucher.",
    });
  }),
  history: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher không hợp lệ.");
    if (!(await service.detail(req.params.id)))
      return fail(res, "Voucher không tồn tại.", 404);
    const pageNumber = Number(req.query.page || 1);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1)
      return fail(res, "Invalid history page.");
    return Response.success(res, {
      data: await service.history(req.params.id, pageNumber),
    });
  }),
  available: wrap(async (req, res) =>
    Response.success(res, {
      data: { vouchers: await service.activeForCustomer(req.user._id) },
    }),
  ),
  apply: wrap(async (req, res) => {
    if (
      !req.body ||
      Object.keys(req.body).some((k) => !["code", "courseId"].includes(k))
    )
      return fail(
        res,
        "Only code and courseId are accepted; price is read from the database.",
      );
    if (!validId(req.body.courseId)) return fail(res, "Course ID is invalid.");
    const preview = await service.preview(req.body.code, req.user._id, req.body.courseId);
    if (preview.error) return fail(res, preview.error.message, preview.error.status);
    const { course, total, result } = preview;
    if (!result.success) return fail(res, result.message);
    return Response.success(res, {
      message: result.message,
      data: {
        ...result,
        courseId: String(course._id),
        orderTotal: total,
        finalTotal: subtractDiscount(total, result.discountAmount),
        previewOnly: true,
      },
    });
  }),
};
