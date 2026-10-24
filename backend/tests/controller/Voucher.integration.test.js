const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Voucher = require("../../src/model/voucher/Voucher");
const Redemption = require("../../src/model/voucher/VoucherRedemption");
const User = require("../../src/model/identity/User");
const Course = require("../../src/model/learning/Course");
const JWT = require("../../src/utils/auth/JWTUtil");
const {
  validateVoucherInput,
  parseDate,
} = require("../../src/service/voucher/VoucherValidation");
const {
  percentageDiscount,
  subtractDiscount,
} = require("../../src/service/voucher/VoucherMoney");
const { app } = require("../../src/index");
const valid = { code: " TEST ", discountPercent: 20 };

test("BookTown validation and decimal HALF_UP", () => {
  const now = new Date("2026-10-23T10:00:00+07:00");
  const r = validateVoucherInput(valid, true, now).value;
  assert.equal(r.code, "TEST");
  assert.equal(r.status, "active");
  assert.equal(r.quantity, null);
  for (const change of [
    { code: "" },
    { discountPercent: 0 },
    { discountPercent: 101 },
    { discountPercent: "NaN" },
    { quantity: 0 },
    { quantity: 1.5 },
    { minOrderValue: -1 },
    { maxDiscountValue: 0 },
    { startDate: "2026-10-22" },
    { startDate: "2099-01-02", endDate: "2099-01-01" },
  ]) {
    assert.ok(
      validateVoucherInput({ ...valid, ...change }, true, now).error,
      JSON.stringify(change),
    );
  }
  assert.equal(parseDate("2026-02-30"), null);
  assert.equal(parseDate("bad"), null);
  assert.equal(
    parseDate("2026-10-23").toISOString(),
    "2026-10-22T17:00:00.000Z",
  );
  assert.equal(
    validateVoucherInput({ ...valid, status: "expired" }, false).value.status,
    "inactive",
  );
  assert.equal(
    validateVoucherInput({ ...valid, statusToggle: "on" }, false).value.status,
    "active",
  );
  assert.equal(
    validateVoucherInput({ ...valid, startDate: "2020-01-01" }, false).error,
    undefined,
  );
  assert.equal(percentageDiscount(1.005, 100), 1.01);
  assert.equal(percentageDiscount(2.675, 100), 2.68);
  assert.equal(percentageDiscount(19.99, 15), 3);
  assert.equal(percentageDiscount(1e-7, 50), 0);
  assert.equal(percentageDiscount(10.075, 100), 10.08);
  assert.equal(subtractDiscount(0.3, 0.1), 0.2);
});

test(
  "7 voucher use cases through HTTP with real isolated MongoDB",
  { timeout: 240000 },
  async (t) => {
    const mongo = await MongoMemoryServer.create();
    const oldSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = "voucher-integration-secret";
    let server;
    t.after(async () => {
      if (server) await new Promise((r) => server.close(r));
      await mongoose.disconnect();
      await mongo.stop();
      if (oldSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
      else process.env.JWT_ACCESS_SECRET = oldSecret;
    });
    await mongoose.connect(mongo.getUri(), { dbName: "voucher_tests" });
    await Promise.all([
      Voucher.init(),
      Redemption.init(),
      User.init(),
      Course.init(),
    ]);
    const users = await User.create(
      ["admin", "student", "teacher"].map((role) => ({
        fullName: "Test " + role,
        email: role + "@voucher.test",
        role,
        emailVerifiedAt: new Date(),
      })),
    );
    const tokens = Object.fromEntries(
      users.map((u) => [u.role, JWT.createAccessToken(u)]),
    );
    const course = await Course.create({
      title: "Voucher test course",
      teacherId: users[2]._id,
      status: "PUBLIC",
      price: 199.99,
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = "http://127.0.0.1:" + server.address().port;
    async function req(url, method = "GET", body, role = "admin") {
      const res = await fetch(base + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(role ? { Authorization: "Bearer " + tokens[role] } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, ...(await res.json()) };
    }
    const admin = "/api/admin/vouchers",
      apply = "/api/student/vouchers/apply";
    const quote = (code) =>
      req(apply, "POST", { code, courseId: String(course._id) }, "student");
    let id;
    await t.test(
      "authorization, empty list, invalid filters and missing IDs",
      async () => {
        for (const [method, url, body] of [
          ["GET", admin],
          ["POST", admin, valid],
          ["GET", admin + "/" + new mongoose.Types.ObjectId()],
          ["PUT", admin + "/" + new mongoose.Types.ObjectId(), valid],
          ["DELETE", admin + "/" + new mongoose.Types.ObjectId()],
        ]) {
          assert.equal((await req(url, method, body, null)).status, 401);
          assert.equal((await req(url, method, body, "student")).status, 403);
        }
        const r = await req(admin);
        assert.deepEqual(r.data.vouchers, []);
        assert.equal(r.data.totalPages, 1);
        assert.equal((await req(admin + "?status=scheduled")).status, 400);
        assert.equal((await req(admin + "/bad")).status, 400);
        assert.equal(
          (await req(admin + "/" + new mongoose.Types.ObjectId())).status,
          404,
        );
        assert.equal(
          (
            await req(
              apply,
              "POST",
              { code: "TEST", courseId: String(course._id) },
              "teacher",
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "create, defaults, normalized duplicate and concurrent duplicate index",
      async () => {
        assert.equal((await req(admin, "POST", valid)).status, 201);
        const v = await Voucher.findOne({ code: "TEST" });
        id = String(v._id);
        assert.equal(v.status, "active");
        assert.equal(v.quantity, null);
        assert.equal(
          (await req(admin, "POST", { ...valid, code: "test" })).status,
          400,
        );
        for (const change of [
          { discountPercent: 101 },
          { quantity: 0 },
          { minOrderValue: -1 },
          { maxDiscountValue: 0 },
          { type: "fixed" },
          { usedCount: 0 },
        ])
          assert.equal(
            (await req(admin, "POST", { ...valid, ...change })).status,
            400,
          );
        const parallel = await Promise.all(
          Array.from({ length: 8 }, () =>
            req(admin, "POST", { ...valid, code: "RACE" }),
          ),
        );
        assert.equal(parallel.filter((r) => r.status === 201).length, 1);
        assert.equal(await Voucher.countDocuments({ code: "RACE" }), 1);
      },
    );
    await t.test(
      "search, pagination, auto-expiry, status filter and detail",
      async () => {
        await Voucher.create({
          code: "OLD",
          discount_percent: 10,
          end_date: new Date("2000-01-01"),
          status: "inactive",
        });
        const r = await req(admin + "?keyword=test&page=999");
        assert.equal(r.data.vouchers.length, 1);
        assert.equal(r.data.page, 1);
        assert.equal((await req(admin + "?keyword=.*")).data.totalRecords, 0);
        assert.equal(
          (await req(admin + "?status=expired")).data.vouchers[0].code,
          "OLD",
        );
        assert.equal((await req(admin + "/" + id)).data.voucher.code, "TEST");
      },
    );
    await t.test(
      "apply uses DB price; percentage, cap, rounding, no redemption",
      async () => {
        let r = await quote(" test ");
        assert.equal(r.status, 200);
        assert.equal(r.data.orderTotal, 199.99);
        assert.equal(r.data.discountAmount, 40);
        assert.equal(r.data.previewOnly, true);
        require("fs").writeFileSync(
          require("path").join(
            __dirname,
            "../../..",
            "docs/voucher-api-example.actual.json",
          ),
          JSON.stringify(
            {
              request: {
                method: "POST",
                path: apply,
                body: { code: "test", courseId: String(course._id) },
              },
              response: r,
            },
            null,
            2,
          ) + "\n",
        );
        assert.equal(
          (
            await req(
              apply,
              "POST",
              { courseId: String(course._id), code: "TEST", orderTotal: 1 },
              "student",
            )
          ).status,
          400,
        );
        await Voucher.updateOne(
          { _id: id },
          { $set: { max_discount_value: 5 } },
        );
        r = await quote("TEST");
        assert.equal(r.data.discountAmount, 5);
        await Voucher.updateOne(
          { _id: id },
          { $set: { discount_percent: 100, max_discount_value: null } },
        );
        await Course.updateOne({ _id: course._id }, { $set: { price: 1.005 } });
        r = await quote("TEST");
        assert.equal(r.data.discountAmount, 1.005);
        assert.equal(r.data.finalTotal, 0);
        await Course.updateOne({ _id: course._id }, { $set: { price: 2.675 } });
        await Voucher.updateOne(
          { _id: id },
          { $set: { discount_percent: 50 } },
        );
        r = await quote("TEST");
        assert.equal(r.data.discountAmount, 1.34);
        await Course.updateOne({ _id: course._id }, { $set: { price: 0.3 } });
        await Voucher.updateOne(
          { _id: id },
          { $set: { discount_percent: 33 } },
        );
        r = await quote("TEST");
        assert.equal(r.data.discountAmount, 0.1);
        assert.equal(r.data.finalTotal, 0.2);
        const boundary = new Date("2030-01-01T00:00:00+07:00");
        await Voucher.create({
          code: "BOUNDARY",
          discount_percent: 20,
          start_date: boundary,
          end_date: boundary,
          min_order_value: 100,
        });
        const { voucherService: service } = require("../../src/composition/services");
        assert.equal(
          (await service.validateApply("BOUNDARY", users[1]._id, 100, boundary))
            .success,
          true,
        );
        assert.match(
          (
            await service.validateApply(
              "BOUNDARY",
              users[1]._id,
              100,
              new Date(boundary.getTime() + 1),
            )
          ).message,
          /hết hạn/,
        );
        await Course.updateOne(
          { _id: course._id },
          { $set: { price: 199.99 } },
        );
        assert.equal(await Redemption.countDocuments(), 0);
      },
    );
    await t.test(
      "apply failures: empty, unknown, inactive, future, expired, minimum, quantity, user",
      async () => {
        assert.match((await quote("")).message, /nhập mã/);
        assert.match((await quote("NONE")).message, /không tồn tại/);
        for (const [change, pattern] of [
          [{ status: "inactive" }, /khả dụng/],
          [
            { status: "active", start_date: new Date("2099-01-01") },
            /chưa tới/,
          ],
          [{ start_date: null, end_date: new Date("2000-01-01") }, /hết hạn/],
          [{ end_date: null, min_order_value: 200 }, /tối thiểu/],
        ]) {
          await Voucher.updateOne({ _id: id }, { $set: change });
          const r = await quote("TEST");
          assert.equal(r.status, 400);
          assert.match(r.message, pattern);
        }
        await Voucher.updateOne(
          { _id: id },
          { $set: { min_order_value: null, quantity: 1 } },
        );
        await Redemption.create({ userId: users[0]._id, voucherID: id });
        assert.match((await quote("TEST")).message, /hết lượt/);
        await Voucher.updateOne({ _id: id }, { $set: { quantity: null } });
        await Redemption.create({ userId: users[1]._id, voucherID: id });
        assert.match((await quote("TEST")).message, /đã sử dụng/);
        assert.equal(
          (
            await req(
              apply,
              "POST",
              { code: "TEST", courseId: String(new mongoose.Types.ObjectId()) },
              "student",
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      "update preserves history; used delete blocked; soft delete and reuse",
      async () => {
        const before = await Redemption.countDocuments({ voucherID: id });
        assert.equal(
          (
            await req(admin + "/" + id, "PUT", {
              ...valid,
              code: "RENAMED",
              status: "inactive",
            })
          ).status,
          200,
        );
        assert.equal(
          await Redemption.countDocuments({ voucherID: id }),
          before,
        );
        assert.equal((await req(admin + "/" + id, "DELETE")).status, 400);
        assert.equal(
          (await req(admin + "/" + id)).data.voucher.usedCount,
          before,
        );
        assert.equal(
          (
            await req(admin + "/" + id, "PUT", {
              ...valid,
              code: "RACE",
              status: "active",
            })
          ).status,
          400,
        );
        const unused = await Voucher.findOne({ code: "RACE" });
        assert.equal(
          (await req(admin + "/" + unused._id, "DELETE")).status,
          200,
        );
        assert.equal((await Voucher.findById(unused._id)).is_deleted, true);
        assert.equal((await req(admin + "/" + unused._id)).status, 404);
        assert.equal(
          (await req(admin, "POST", { ...valid, code: "RACE" })).status,
          201,
        );
      },
    );
    await t.test(
      "concurrent previews do not reserve quantity; failed requests do not consume",
      async () => {
        await Voucher.create({
          code: "LAST",
          discount_percent: 25,
          quantity: 1,
        });
        const before = await Redemption.countDocuments();
        assert.ok(
          (
            await Promise.all(Array.from({ length: 20 }, () => quote("LAST")))
          ).every((r) => r.status === 200),
        );
        assert.equal((await quote("MISSING")).status, 400);
        assert.equal(await Redemption.countDocuments(), before);
      },
    );
    await t.test(
      "status toggle, available vouchers and admin-only paginated history",
      async () => {
        const unused = await Voucher.findOne({
          code: "RACE",
          is_deleted: false,
        });
        let res = await req(admin + "/" + unused._id + "/status", "PATCH", {
          newStatus: "inactive",
        });
        assert.equal(res.status, 200);
        assert.equal(res.message, "Đã vô hiệu hóa voucher.");
        assert.equal(
          (
            await req(admin + "/" + unused._id + "/status", "PATCH", {
              newStatus: "expired",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(admin + "/" + unused._id + "/status", "PATCH", {
              newStatus: "active",
              usedCount: 0,
            })
          ).status,
          400,
        );
        const expired = await Voucher.findOne({ code: "OLD" });
        assert.equal(
          (
            await req(admin + "/" + expired._id + "/status", "PATCH", {
              newStatus: "active",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await req(
              admin + "/" + unused._id + "/status",
              "PATCH",
              { newStatus: "active" },
              "student",
            )
          ).status,
          403,
        );
        res = await req(
          "/api/student/vouchers/available",
          "GET",
          undefined,
          "student",
        );
        assert.equal(res.status, 200);
        assert.ok(res.data.vouchers.some((v) => v.code === "LAST"));
        assert.ok(
          !res.data.vouchers.some((v) =>
            ["RENAMED", "OLD", "RACE", "BOUNDARY"].includes(v.code),
          ),
        );
        assert.equal(
          (
            await req(
              "/api/student/vouchers/available",
              "GET",
              undefined,
              "teacher",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              admin + "/" + id + "/redemptions",
              "GET",
              undefined,
              "student",
            )
          ).status,
          403,
        );
        res = await req(admin + "/" + id + "/redemptions?page=999");
        assert.equal(res.status, 200);
        assert.equal(res.data.page, 1);
        assert.equal(res.data.totalRecords, 2);
        assert.equal(res.data.redemptions.length, 2);
        assert.equal(res.data.redemptions[0].userId.passwordHash, undefined);
        assert.equal(
          (await req(admin + "/" + id + "/redemptions?page=-1")).status,
          400,
        );
        assert.equal((await req(admin + "/bad/redemptions")).status, 400);
        assert.equal(
          (
            await req(
              admin + "/" + new mongoose.Types.ObjectId() + "/redemptions",
            )
          ).status,
          404,
        );
        assert.equal(
          (await req(admin + "/" + unused._id + "/redemptions")).data
            .totalRecords,
          0,
        );
        assert.equal(
          (
            await req(
              "/api/student/vouchers/redeem",
              "POST",
              { paymentSuccess: true },
              "student",
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(admin + "/" + unused._id + "/status", "PATCH", {
              newStatus: "active",
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "standalone refuses redemption; real database outage returns 500",
      async () => {
        const before = await Redemption.countDocuments();
        let purchaseCalled = false;
        await assert.rejects(
          require('../../src/composition/services').voucherCheckoutService.redeemForCheckout({
            code: 'LAST', userId: String(users[1]._id), courseId: String(course._id), transactionId: 'standalone',
          }, async () => { purchaseCalled = true; }),
          error => error.status === 503,
        );
        assert.equal(purchaseCalled, false);
        assert.equal(await Redemption.countDocuments(), before);
        mongoose.set("bufferCommands", false);
        await mongoose.disconnect();
        assert.equal((await req(admin)).status, 500);
        assert.equal((await quote("LAST")).status, 500);
        await mongoose.connect(mongo.getUri(), { dbName: "voucher_tests" });
        assert.equal(await Redemption.countDocuments(), before);
      },
    );
  },
);
