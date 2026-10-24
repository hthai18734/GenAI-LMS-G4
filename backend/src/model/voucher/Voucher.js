const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    discount_percent: { type: Number, required: true, min: 0, max: 100 },
    quantity: { type: Number, default: null },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
    },
    is_deleted: { type: Boolean, default: false },
    min_order_value: { type: Number, default: null },
    max_discount_value: { type: Number, default: null },
    usageRevision: { type: Number, default: 0, select: false },
  },
  { timestamps: true, versionKey: false },
);
schema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
schema.index({ is_deleted: 1, status: 1, _id: -1 });
module.exports = mongoose.model("Voucher", schema);
