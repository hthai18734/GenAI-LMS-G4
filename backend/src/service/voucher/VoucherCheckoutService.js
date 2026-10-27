const ServiceError = require("../common/ServiceError");
const { subtractDiscount } = require("../../domain/voucher/VoucherMoney");

function createVoucherCheckoutService({
  transactionRepository: TransactionRepository,
  voucherRepository: VoucherRepository,
  voucherRedemptionRepository: VoucherRedemptionRepository,
  courseRepository: CourseRepository,
  userRepository: UserRepository,
  voucherService,
}) {
const { validateApply } = voucherService;

function assertInput(input, completePurchase) {
  if (!input || typeof completePurchase !== "function")
    throw new ServiceError(
      400,
      "A backend purchase completion callback is required.",
    );
  for (const key of ["userId", "courseId"]) {
    if (!/^[a-f\d]{24}$/i.test(String(input[key])))
      throw new ServiceError(400, `${key} is invalid.`);
  }
  if (typeof input.code !== "string" || !input.code.trim())
    throw new ServiceError(400, "Vui lòng nhập mã voucher.");
  if (
    typeof input.transactionId !== "string" ||
    !input.transactionId.trim() ||
    input.transactionId.trim().length > 200
  )
    throw new ServiceError(
      400,
      "A stable transaction ID of at most 200 characters is required.",
    );
  // This API is server-only. It never accepts client totals or payment success flags.
  if (
    Object.keys(input).some(
      (key) => !["code", "userId", "courseId", "transactionId"].includes(key),
    )
  )
    throw new ServiceError(400, "Unsupported checkout voucher field.");
}

function replay(redemption, input) {
  if (
    String(redemption.userId) !== String(input.userId) ||
    String(redemption.courseId) !== String(input.courseId) ||
    redemption.code !== input.code.trim().toUpperCase()
  )
    throw new ServiceError(
      409,
      "Transaction ID has already been used for another purchase.",
    );
  return {
    redemption: redemption.toObject ? redemption.toObject() : redemption,
    replayed: true,
  };
}

/**
 * Backend-only integration point. Call after verifying the payment event.
 * completePurchase({session, quote}) MUST write the purchase/enrollment using
 * the supplied session and throw on failure. MongoDB can retry this callback:
 * never charge a provider, send email or perform other external effects here.
 * All writes, including redemption, become visible only when commit succeeds.
 */
async function redeemForCheckout(input, completePurchase) {
  assertInput(input, completePurchase);
  input = { ...input, transactionId: input.transactionId.trim() };
  try {
    return await TransactionRepository.run(
      async (session) => {
        const existing = await VoucherRedemptionRepository.findByTransactionId(input.transactionId, session);
        if (existing) return replay(existing, input);

        const user = await UserRepository.findActiveVerifiedStudent(input.userId, session);
        if (!user)
          throw new ServiceError(
            403,
            "An active verified student account is required.",
          );

        // A shared document write serializes all redemptions of this voucher,
        // including different users competing for its final available use.
        const voucher = await VoucherRepository.lockByCode(input.code.trim().toUpperCase(), session);
        if (!voucher) throw new ServiceError(400, "Mã voucher không tồn tại.");
        const course = await CourseRepository.findPublicForCheckout(input.courseId, session);
        if (!course) throw new ServiceError(404, "Course not found.");
        if (!Number.isFinite(course.price) || course.price < 0)
          throw new ServiceError(422, "Invalid stored course price.");
        const result = await validateApply(
          input.code,
          input.userId,
          course.price,
          new Date(),
          session,
        );
        if (!result.success) throw new ServiceError(409, result.message);
        const quote = {
          userId: String(user._id),
          courseId: String(course._id),
          voucherID: String(voucher._id),
          transactionId: input.transactionId,
          code: voucher.code,
          orderTotal: course.price,
          discountAmount: result.discountAmount,
          finalTotal: subtractDiscount(course.price, result.discountAmount),
        };
        const redemption = await VoucherRedemptionRepository.create({ ...quote, is_used: true }, session);
        await completePurchase({ session, quote: Object.freeze({ ...quote }) });
        return { redemption, replayed: false };
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    );
  } catch (error) {
    if (error.code === 11000) {
      const existing = await VoucherRedemptionRepository.findByTransactionId(input.transactionId);
      if (existing) return replay(existing, input);
      if (
        await VoucherRedemptionRepository.hasUsed(
          input.userId,
          (await VoucherRepository.findByCode(input.code.trim().toUpperCase()))?._id,
        )
      )
        throw new ServiceError(409, "Bạn đã sử dụng voucher này rồi.");
    }
    if (error.code === 20 && /Transaction numbers/.test(error.message))
      throw new ServiceError(
        503,
        "Voucher redemption requires MongoDB replica set transactions.",
      );
    throw error;
  }
}

return Object.freeze({ redeemForCheckout });
}

module.exports = createVoucherCheckoutService;
