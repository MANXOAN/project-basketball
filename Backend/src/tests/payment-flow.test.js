import assert from "assert";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import qs from "qs";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import BookingSlot from "../models/BookingSlot";
import { expirePendingPayments } from "../controllers/booking";
import { processVnpayCallback } from "../services/vnpayPayment";
import { buildPaymentConfirmationEmail } from "../utils/bookingEmail";

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
