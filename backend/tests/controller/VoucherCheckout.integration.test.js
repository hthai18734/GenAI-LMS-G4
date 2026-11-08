const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Voucher = require("../../src/model/voucher/Voucher");
const Redemption = require("../../src/model/voucher/VoucherRedemption");
const User = require("../../src/model/identity/User");
const Course = require("../../src/model/learning/Course");
const {
  voucherService: service,
  voucherCheckoutService: { redeemForCheckout },
} = require("../../src/composition/services");

test(
  "voucher checkout integration contract on real MongoDB replica set",
  { timeout: 240000 },
  async (t) => {
    const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    t.after(async () => {
      await mongoose.disconnect();
      await mongo.stop();
    });
    await mongoose.connect(mongo.getUri(), {
      dbName: "voucher_checkout_tests",
    });
    await Promise.all([
      Voucher.init(),
      Redemption.init(),
      User.init(),
      Course.init(),
    ]);
    // Test-only purchase collection proves real cross-collection commit/rollback.
    await mongoose.connection.db.createCollection("voucher_test_purchases");
    const purchases = mongoose.connection.db.collection(
      "voucher_test_purchases",
    );
    await purchases.createIndex({ transactionId: 1 }, { unique: true });
    const teacher = await User.create({
      fullName: "Test Teacher",
      email: "teacher@checkout.test",
      role: "teacher",
      emailVerifiedAt: new Date(),
    });
    const course = await Course.create({
      title: "Test checkout course",
      teacherId: teacher._id,
      status: "PUBLIC",
      price: 199.99,
    });
    let sequence = 0;
    async function student() {
      return User.create({
        fullName: "Test Student",
        email: `student${++sequence}@checkout.test`,
        role: "student",
        emailVerifiedAt: new Date(),
      });
    }
    async function voucher(code, quantity = null) {
      return Voucher.create({ code, discount_percent: 20, quantity });
    }
    const input = (code, user, transactionId) => ({
      code,
      userId: String(user._id),
      courseId: String(course._id),
      transactionId,
    });
    const complete = async ({ session, quote }) => {
      await purchases.insertOne({ ...quote }, { session });
    };

    await t.test(
      "backend validates identity, fields, callback and stable transaction reference",
      async () => {
        const user = await student();
        await voucher("INPUT");
        for (const change of [
          { userId: "bad" },
          { courseId: "bad" },
          { transactionId: "" },
          { code: "" },
          { orderTotal: 1 },
          { paymentSuccess: true },
        ])
          await assert.rejects(
            redeemForCheckout(
              { ...input("INPUT", user, "input"), ...change },
              complete,
            ),
            (e) => e.status === 400,
          );
        await assert.rejects(
          redeemForCheckout(input("INPUT", user, "input")),
          (e) => e.status === 400,
        );
        await assert.rejects(
          redeemForCheckout(input("INPUT", teacher, "teacher"), complete),
          (e) => e.status === 403,
        );
        await User.updateOne(
          { _id: user._id },
          { $set: { status: "inactive" } },
        );
        await assert.rejects(
          redeemForCheckout(input("INPUT", user, "input"), complete),
          (e) => e.status === 403,
        );
        assert.equal(await Redemption.countDocuments(), 0);
      },
    );
    await t.test(
      "success atomically records immutable price snapshot and purchase",
      async () => {
        const user = await student(),
          v = await voucher("SUCCESS");
        const result = await redeemForCheckout(
          input("success", user, "success"),
          complete,
        );
        assert.equal(result.replayed, false);
        assert.equal(result.redemption.orderTotal, 199.99);
        assert.equal(result.redemption.discountAmount, 40);
        assert.equal(result.redemption.finalTotal, 159.99);
        assert.equal(await Redemption.countDocuments({ voucherID: v._id }), 1);
        assert.equal(
          await purchases.countDocuments({ transactionId: "success" }),
          1,
        );
        await service.update(String(v._id), {
          code: "SUCCESS-EDIT",
          discount_percent: 80,
        });
        const history = await Redemption.findOne({ transactionId: "success" });
        assert.equal(history.code, "SUCCESS");
        assert.equal(history.discountAmount, 40);
        assert.equal(await service.remove(String(v._id)), -1);
      },
    );
    await t.test(
      "purchase failure rolls back usage, lock revision and purchase writes",
      async () => {
        const user = await student(),
          v = await voucher("ROLLBACK", 1);
        await assert.rejects(
          redeemForCheckout(
            input("ROLLBACK", user, "rollback"),
            async (context) => {
              await complete(context);
              throw new Error("Purchase could not be completed");
            },
          ),
          /Purchase could not be completed/,
        );
        assert.equal(await Redemption.countDocuments({ voucherID: v._id }), 0);
        assert.equal(
          await purchases.countDocuments({ transactionId: "rollback" }),
          0,
        );
        assert.equal(
          (await Voucher.findById(v._id).select("+usageRevision"))
            .usageRevision,
          0,
        );
        const result = await redeemForCheckout(
          input("ROLLBACK", user, "rollback"),
          complete,
        );
        assert.equal(result.replayed, false);
      },
    );
    await t.test(
      "different students competing for final use: exactly one commit",
      async () => {
        const v = await voucher("LAST-USE", 1),
          students = [];
        for (let i = 0; i < 12; i++) students.push(await student());
        const results = await Promise.allSettled(
          students.map((u, i) =>
            redeemForCheckout(input("LAST-USE", u, `last-${i}`), complete),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        for (const r of results.filter((r) => r.status === "rejected"))
          assert.match(r.reason.message, /hết lượt/);
        assert.equal(await Redemption.countDocuments({ voucherID: v._id }), 1);
        assert.equal(await purchases.countDocuments({ code: "LAST-USE" }), 1);
      },
    );
    await t.test(
      "same student concurrent purchases cannot reuse voucher",
      async () => {
        const v = await voucher("SAME-USER"),
          user = await student();
        const results = await Promise.allSettled(
          Array.from({ length: 8 }, (_, i) =>
            redeemForCheckout(input("SAME-USER", user, `same-${i}`), complete),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        for (const r of results.filter((r) => r.status === "rejected"))
          assert.match(r.reason.message, /đã sử dụng/);
        assert.equal(await Redemption.countDocuments({ voucherID: v._id }), 1);
        assert.equal(await purchases.countDocuments({ code: "SAME-USER" }), 1);
      },
    );
    await t.test(
      "duplicate payment events replay without running completion again",
      async () => {
        const v = await voucher("REPLAY"),
          user = await student();
        let completions = 0;
        const result = await Promise.all(
          Array.from({ length: 6 }, () =>
            redeemForCheckout(
              input("REPLAY", user, "replay"),
              async (context) => {
                completions++;
                await complete(context);
              },
            ),
          ),
        );
        assert.equal(result.filter((r) => !r.replayed).length, 1);
        assert.equal(completions, 1);
        assert.equal(await Redemption.countDocuments({ voucherID: v._id }), 1);
        await Course.updateOne({ _id: course._id }, { $set: { price: 500 } });
        const again = await redeemForCheckout(
          input("REPLAY", user, "replay"),
          complete,
        );
        assert.equal(again.redemption.orderTotal, 199.99);
        assert.equal(again.replayed, true);
        await Course.updateOne(
          { _id: course._id },
          { $set: { price: 199.99 } },
        );
        await assert.rejects(
          redeemForCheckout(
            input("REPLAY", await student(), "replay"),
            complete,
          ),
          (e) => e.status === 409,
        );
      },
    );
    await t.test(
      "transaction ID cannot commit different vouchers concurrently",
      async () => {
        await voucher("TX-A");
        await voucher("TX-B");
        const users = [await student(), await student()];
        const results = await Promise.allSettled(
          ["TX-A", "TX-B"].map((code, i) =>
            redeemForCheckout(input(code, users[i], "collision"), complete),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(
          await Redemption.countDocuments({ transactionId: "collision" }),
          1,
        );
        assert.equal(
          await purchases.countDocuments({ transactionId: "collision" }),
          1,
        );
        assert.equal(
          results.find((r) => r.status === "rejected").reason.status,
          409,
        );
      },
    );
    await t.test(
      "delete racing with redemption never deletes a used voucher",
      async () => {
        for (let i = 0; i < 6; i++) {
          const code = `DELETE-RACE-${i}`,
            v = await voucher(code),
            user = await student();
          await Promise.allSettled([
            service.remove(String(v._id)),
            redeemForCheckout(input(code, user, code), complete),
          ]);
          const saved = await Voucher.findById(v._id),
            used = await Redemption.countDocuments({ voucherID: v._id });
          assert.ok(!(saved.is_deleted && used > 0));
          if (used) assert.equal(await service.remove(String(v._id)), -1);
        }
      },
    );
    await t.test(
      "revalidation rejects stale previews and never invokes purchase completion",
      async () => {
        const v = await voucher("STALE"),
          user = await student();
        let called = false;
        assert.equal(
          (await service.validateApply("STALE", user._id, course.price))
            .success,
          true,
        );
        for (const change of [
          { status: "inactive" },
          { status: "active", end_date: new Date("2000-01-01") },
          { end_date: null, min_order_value: 200 },
        ]) {
          await Voucher.updateOne({ _id: v._id }, { $set: change });
          await assert.rejects(
            redeemForCheckout(input("STALE", user, "stale"), async () => {
              called = true;
            }),
            (e) => e.status === 409,
          );
        }
        assert.equal(called, false);
        assert.equal(await Redemption.countDocuments({ voucherID: v._id }), 0);
      },
    );
    await t.test(
      "legacy voucher without revision remains deletable safely",
      async () => {
        const v = await voucher("LEGACY");
        await Voucher.collection.updateOne(
          { _id: v._id },
          { $unset: { usageRevision: "" } },
        );
        assert.equal(await service.remove(String(v._id)), 1);
      },
    );
  },
);
