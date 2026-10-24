const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    voucherID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      required: true,
    },
    is_used: { type: Boolean, default: true },
    transactionId: String,
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    code: String,
    orderTotal: Number,
    discountAmount: Number,
    finalTotal: Number,
  },
  { timestamps: true, versionKey: false },
);
schema.index({ userId: 1, voucherID: 1 }, { unique: true });
schema.index({ voucherID: 1, is_used: 1 });
schema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { transactionId: { $type: "string" } },
  },
);
// No public write endpoint: preview must never consume usage.
module.exports = mongoose.model("VoucherRedemption", schema);
