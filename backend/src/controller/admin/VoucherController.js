module.exports = function createController(UseCases) {
const { voucherService: service } = UseCases;
const {
  validateVoucherInput,
} = require("../../dto/voucher/VoucherWriteDTO");
const Response = require("../../utils/common/ResponseUtil");
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
return  {
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
    if (!validId(req.params.id)) return fail(res, "Voucher is invalid.");
    const voucher = await service.detail(req.params.id);
    return voucher
      ? Response.success(res, { data: { voucher } })
      : fail(res, "Voucher not found.", 404);
  }),
  create: wrap(async (req, res) => {
    const data = input(req, res, true);
    if (!data) return;
    return (await service.create(data))
      ? Response.success(res, {
          status: 201,
          message: `Voucher ${data.code} created successfully.`,
        })
      : fail(res, "Unable to create voucher. The code may already exist.");
  }),
  update: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher is invalid.");
    const data = input(req, res, false);
    if (!data) return;
    return (await service.update(req.params.id, data))
      ? Response.success(res, { message: "Voucher updated successfully." })
      : fail(
          res,
          "Unable to update voucher. The code may already exist or the voucher may no longer exist.",
        );
  }),
  remove: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher is invalid.");
    const r = await service.remove(req.params.id);
    return r === 1
      ? Response.success(res, { message: "Voucher deleted successfully." })
      : fail(
          res,
          r === -1
            ? "A voucher that has already been redeemed cannot be deleted."
            : "Unable to delete voucher.",
        );
  }),
  toggle: wrap(async (req, res) => {
    if (
      !validId(req.params.id) ||
      !req.body ||
      Object.keys(req.body).some((k) => k !== "newStatus") ||
      !["active", "inactive"].includes(req.body.newStatus)
    )
      return fail(res, "Invalid request.");
    if (!(await service.toggle(req.params.id, req.body.newStatus)))
      return fail(res, "Unable to update voucher status. The voucher may have expired.");
    return Response.success(res, {
      message:
        req.body.newStatus === "active"
          ? "Voucher activated."
          : "Voucher deactivated.",
    });
  }),
  history: wrap(async (req, res) => {
    if (!validId(req.params.id)) return fail(res, "Voucher is invalid.");
    if (!(await service.detail(req.params.id)))
      return fail(res, "Voucher not found.", 404);
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
    const { course, total, result, finalTotal } = preview;
    if (!result.success) return fail(res, result.message);
    return Response.success(res, {
      message: result.message,
      data: {
        ...result,
        courseId: String(course._id),
        orderTotal: total,
        finalTotal,
        previewOnly: true,
      },
    });
  }),
};
};
