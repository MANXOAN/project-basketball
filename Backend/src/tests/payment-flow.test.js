import assert from "assert";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import qs from "qs";
import Booking from "../models/Booking";
import BookingGroup from "../models/BookingGroup";
import Field from "../models/Field";
import Court from "../models/Court";
import Payment from "../models/Payment";
import BookingSlot from "../models/BookingSlot";
import { cancelBooking, createBooking, expirePendingPayments } from "../controllers/booking";
import { processVnpayCallback } from "../services/vnpayPayment";
import { buildPaymentConfirmationEmail } from "../utils/bookingEmail";
import { setCounter } from "../utils/ids";

function signedQuery(paymentCode, amount, transactionNo) {
  const params = {
    vnp_Amount: String(amount * 100),
    vnp_BankCode: "NCB",
    vnp_ResponseCode: "00",
    vnp_TmnCode: "TESTCODE",
    vnp_TransactionNo: transactionNo,
    vnp_TransactionStatus: "00",
    vnp_TxnRef: paymentCode,
  };
  const sorted = {};
  Object.keys(params)
    .map((key) => encodeURIComponent(key))
    .sort()
    .forEach((key) => {
      sorted[key] = encodeURIComponent(params[key]).replace(/%20/g, "+");
    });
  const signData = qs.stringify(sorted, { encode: false });
  return {
    ...params,
    vnp_SecureHash: crypto
      .createHmac("sha512", process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex"),
  };
}

function responseRecorder() {
  const result = { statusCode: 200, body: null };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return this; },
  };
  return { result, res };
}

async function run() {
  process.env.VNP_HASH_SECRET = "payment-test-secret";
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;

  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  try {
    await Booking.create({
      id: 1,
      fieldId: 1,
      courtId: 1,
      fieldName: "Cơ sở Test",
      court: "Sân A",
      date: "2030-01-01",
      time: "08:00",
      duration: 1,
      total: 100000,
      customer: { fullName: "Khách Test", phone: "0900000000", email: "test@example.com", userId: 1 },
      paymentMethod: "full",
      paymentStatus: "unpaid",
      paidAmount: 0,
      status: "pending",
    });
    await Payment.create({
      bookingId: 1,
      paymentCode: "1_full_first",
      gateway: "vnpay",
      paymentKind: "full",
      amount: 100000,
      status: "pending",
    });

    const firstQuery = signedQuery("1_full_first", 100000, "TXN001");
    const first = await processVnpayCallback(firstQuery);
    assert.equal(first.state, "success");

    const repeated = await processVnpayCallback(firstQuery);
    assert.equal(repeated.state, "success");
    const paidBooking = await Booking.findOne({ id: 1 });
    assert.equal(paidBooking.paidAmount, 100000);
    assert.equal(paidBooking.paymentStatus, "paid");

    await Payment.create({
      bookingId: 1,
      paymentCode: "1_full_duplicate",
      gateway: "vnpay",
      paymentKind: "full",
      amount: 100000,
      status: "pending",
    });
    const duplicate = await processVnpayCallback(
      signedQuery("1_full_duplicate", 100000, "TXN002")
    );
    assert.equal(duplicate.state, "refund_pending");

    const duplicatePayment = await Payment.findOne({ paymentCode: "1_full_duplicate" });
    const refundBooking = await Booking.findOne({ id: 1 });
    assert.equal(duplicatePayment.status, "refund_pending");
    assert.equal(refundBooking.paidAmount, 100000);
    assert.equal(refundBooking.refundAmount, 100000);
    assert.equal(refundBooking.refundStatus, "pending");

    await Payment.create({
      bookingId: 1,
      paymentCode: "1_full_bad_amount",
      gateway: "vnpay",
      paymentKind: "full",
      amount: 100000,
      status: "pending",
    });
    const invalidAmount = await processVnpayCallback(
      signedQuery("1_full_bad_amount", 90000, "TXN003")
    );
    assert.equal(invalidAmount.state, "invalid_amount");
    assert.equal(invalidAmount.code, "04");

    await Booking.create({
      id: 2,
      fieldId: 1,
      courtId: 2,
      fieldName: "Cơ sở Test",
      court: "Sân B",
      date: "2030-01-02",
      time: "09:00",
      duration: 1,
      total: 100000,
      customer: { fullName: "Khách Hết Hạn", phone: "0911111111", userId: 2 },
      paymentMethod: "full",
      paymentStatus: "unpaid",
      paymentExpiresAt: new Date(Date.now() - 1000),
      status: "pending",
    });
    await BookingSlot.create({ bookingId: 2, courtId: 2, date: "2030-01-02", time: "09:00" });
    await expirePendingPayments();
    const expiredBooking = await Booking.findOne({ id: 2 });
    assert.equal(expiredBooking.status, "cancelled");
    assert.equal(expiredBooking.cancellationReason, "payment_expired");
    assert.equal(await BookingSlot.countDocuments({ bookingId: 2 }), 0);
    await Field.create({
      id: 10,
      name: "Cơ sở ba sân",
      openTime: "06:00",
      closeTime: "22:00",
      status: "active",
    });
    await Court.insertMany([
      { id: 11, fieldId: 10, name: "Sân 1", type: "Bóng rổ 5x5", price: 100000, status: "active" },
      { id: 12, fieldId: 10, name: "Sân 2", type: "Bóng rổ 5x5", price: 120000, status: "active" },
      { id: 13, fieldId: 10, name: "Sân 3", type: "Bóng rổ 3x3", price: 80000, status: "active" },
    ]);
    await setCounter("bookings", 100);

    const groupedResponse = responseRecorder();
    await createBooking({
      user: { id: 50, email: "group@example.com", fullName: "Khách nhóm", role: "user" },
      body: {
        fieldId: 10,
        courtId: 11,
        bookingMode: "full_field",
        scheduleSegments: [
          { startDate: "2030-01-05", endDate: "2030-01-19", time: "08:00" },
          { startDate: "2030-02-02", endDate: "2030-02-09", time: "17:00" },
        ],
        duration: 1,
        customer: { fullName: "Khách nhóm", phone: "0988888888" },
        services: [],
        paymentMethod: "full",
      },
    }, groupedResponse.res);
    assert.equal(groupedResponse.result.statusCode, 201);
    assert.equal(groupedResponse.result.body.groupSize, 5);
    assert.deepEqual(groupedResponse.result.body.reservedCourtIds, [11, 12, 13]);
    assert.equal(groupedResponse.result.body.groupTotal, 1500000);
    assert.equal(await BookingSlot.countDocuments({ bookingId: { $in: groupedResponse.result.body.bookingIds } }), 30);

    const groupId = groupedResponse.result.body.bookingGroupId;
    const group = await BookingGroup.findOne({ id: groupId });
    assert.equal(group.bookingIds.length, 5);
    assert.equal(group.paymentStatus, "unpaid");

    const conflictResponse = responseRecorder();
    await createBooking({
      user: { id: 51, email: "other@example.com", fullName: "Khách khác", role: "user" },
      body: {
        fieldId: 10, courtId: 12, date: "2030-01-05", time: "08:00", duration: 1,
        customer: { fullName: "Khách khác", phone: "0977777777" },
        services: [], paymentMethod: "cash",
      },
    }, conflictResponse.res);
    assert.equal(conflictResponse.result.statusCode, 409);

    const cancellableResponse = responseRecorder();
    await createBooking({
      user: { id: 52, email: "cancel@example.com", fullName: "Khách hủy", role: "user" },
      body: {
        fieldId: 10, courtId: 11, duration: 1,
        scheduleSegments: [{ startDate: "2030-03-02", endDate: "2030-03-09", time: "10:00" }],
        customer: { fullName: "Khách hủy", phone: "0966666666" },
        services: [], paymentMethod: "full",
      },
    }, cancellableResponse.res);
    assert.equal(cancellableResponse.result.statusCode, 201);
    const cancelResponse = responseRecorder();
    await cancelBooking({
      user: { id: 52, role: "user" },
      params: { id: String(cancellableResponse.result.body.id) },
      body: {},
    }, cancelResponse.res);
    assert.equal(cancelResponse.result.statusCode, 200);
    assert.equal(cancelResponse.result.body.cancelledGroupSize, 2);
    assert.equal(await BookingSlot.countDocuments({ bookingId: { $in: cancellableResponse.result.body.bookingIds } }), 0);
    assert.equal((await BookingGroup.findOne({ id: cancellableResponse.result.body.bookingGroupId })).status, "cancelled");

    await Payment.create({
      bookingId: groupedResponse.result.body.id,
      bookingGroupId: groupId,
      paymentCode: "group_full_first",
      gateway: "vnpay",
      paymentKind: "full",
      amount: 1500000,
      status: "pending",
    });
    const groupPaymentQuery = signedQuery("group_full_first", 1500000, "TXNGROUP01");
    const groupPayment = await processVnpayCallback(groupPaymentQuery);
    assert.equal(groupPayment.state, "success");
    const paidGroup = await BookingGroup.findOne({ id: groupId });
    const paidMembers = await Booking.find({ bookingGroupId: groupId });
    assert.equal(paidGroup.paymentStatus, "paid");
    assert.equal(paidGroup.paidAmount, 1500000);
    assert.equal(paidMembers.length, 5);
    assert(paidMembers.every((member) => member.paymentStatus === "paid" && member.status === "confirmed"));
    assert.equal((await processVnpayCallback(groupPaymentQuery)).state, "success");

    await Payment.create({
      bookingId: groupedResponse.result.body.id,
      bookingGroupId: groupId,
      paymentCode: "group_full_duplicate",
      gateway: "vnpay",
      paymentKind: "full",
      amount: 1500000,
      status: "pending",
    });
    const duplicateGroupPayment = await processVnpayCallback(
      signedQuery("group_full_duplicate", 1500000, "TXNGROUP02")
    );
    assert.equal(duplicateGroupPayment.state, "refund_pending");

    const email = buildPaymentConfirmationEmail(
      { ...paidBooking.toObject(), customer: { fullName: "<script>alert(1)</script>", phone: "0900000000" } },
      { paymentKind: "full", amount: 100000, paymentCode: "test" }
    );
    assert(!email.html.includes("<script>"));
    assert(email.html.includes("&lt;script&gt;"));

    console.log("Payment flow tests passed");
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
