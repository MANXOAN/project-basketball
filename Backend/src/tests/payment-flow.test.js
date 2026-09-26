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
import BookingHistory from "../models/BookingHistory";
import Voucher from "../models/Voucher";
import { cancelBooking, completeRefund, createBooking, expirePendingPayments, getBookingDetail, getRefundRequests } from "../controllers/booking";
import { checkBookingAvailability } from "../controllers/bookingAvailability";
import { processVnpayCallback } from "../services/vnpayPayment";
import { requestBookingReschedule } from "../services/bookingGroupService";
import { buildCashBookingEmail, buildComplimentaryBookingEmail, buildPaymentConfirmationEmail } from "../utils/bookingEmail";
import { setCounter } from "../utils/ids";
import { createVoucher, validateVoucher } from "../controllers/voucher";

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

function localDateTimeFromNow(offsetMinutes) {
  const value = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return {
    date: [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-"),
    time: [String(value.getHours()).padStart(2, "0"), String(value.getMinutes()).padStart(2, "0")].join(":"),
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

    const vietnamToday = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sameDayPastResponse = responseRecorder();
    await createBooking({
      user: { id: 49, email: "past.example.com", fullName: "Khách giờ cũ", role: "user" },
      body: {
        fieldId: 10, courtId: 11, date: vietnamToday, time: "00:00", duration: 1,
        customer: { fullName: "Khách giờ cũ", phone: "0900000049" },
        services: [], paymentMethod: "cash",
      },
    }, sameDayPastResponse.res);
    assert.equal(sameDayPastResponse.result.statusCode, 400);
    assert.equal(sameDayPastResponse.result.body.message, "Khung giờ 00:00 ngày " + vietnamToday + " đã qua, vui lòng chọn thời gian khác");

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

    const availabilityResponse = responseRecorder();
    await checkBookingAvailability({
      body: {
        courtId: 11, duration: 1, bookingMode: "court",
        occurrences: [{ date: "2030-01-05", time: "08:00" }, { date: "2030-01-06", time: "08:00" }],
      },
    }, availabilityResponse.res);
    assert.equal(availabilityResponse.result.statusCode, 200);
    assert.equal(availabilityResponse.result.body.available, false);
    assert.equal(availabilityResponse.result.body.conflicts.length, 1);

    const durationAwareAvailability = responseRecorder();
    await checkBookingAvailability({
      body: {
        courtId: 11, duration: 0.5, bookingMode: "court",
        occurrences: [{ date: "2030-01-05", time: "07:00", duration: 1.5 }],
      },
    }, durationAwareAvailability.res);
    assert.equal(durationAwareAvailability.result.statusCode, 200);
    assert.equal(durationAwareAvailability.result.body.available, false);
    assert.equal(availabilityResponse.result.body.conflicts[0].date, "2030-01-05");
    assert(availabilityResponse.result.body.conflicts[0].suggestions.length > 0);

    const adjustedScheduleResponse = responseRecorder();
    await createBooking({
      user: { id: 53, email: "adjusted@example.com", fullName: "Khách đổi giờ", role: "user" },
      body: {
        fieldId: 10, courtId: 13, date: "2030-04-10", time: "15:00", duration: 1,
        occurrences: [{ date: "2030-04-10", time: "15:00", duration: 1 }, { date: "2030-04-17", time: "16:00", duration: 1.5 }],
        customer: { fullName: "Khách đổi giờ", phone: "0922222222" },
        services: [], paymentMethod: "cash",
      },
    }, adjustedScheduleResponse.res);
    assert.equal(adjustedScheduleResponse.result.statusCode, 201);
    const adjustedMembers = await Booking.find({ bookingGroupId: adjustedScheduleResponse.result.body.bookingGroupId }).sort({ date: 1 });
    assert.deepEqual(adjustedMembers.map((item) => item.time), ["15:00", "16:00"]);
    assert.deepEqual(adjustedMembers.map((item) => item.duration), [1, 1.5]);
    assert.equal(adjustedMembers.reduce((sum, item) => sum + item.total, 0), 200000);
    assert.equal(await BookingSlot.countDocuments({ bookingId: { $in: adjustedScheduleResponse.result.body.bookingIds } }), 5);

    const detailResponse = responseRecorder();
    await getBookingDetail({
      user: { id: 50, role: "user" },
      params: { id: String(groupedResponse.result.body.id) },
    }, detailResponse.res);
    assert.equal(detailResponse.result.statusCode, 200);
    assert.equal(detailResponse.result.body.bookingMode, "full_field");
    assert.deepEqual(
      detailResponse.result.body.reservedCourts.map((court) => court.name),
      ["Sân 1", "Sân 2", "Sân 3"]
    );
    assert.equal(detailResponse.result.body.groupSchedule.length, 5);
    assert.equal(detailResponse.result.body.groupSchedule[3].time, "17:00");

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
    assert.equal(cancelResponse.result.body.id, cancellableResponse.result.body.id);
    assert.equal(cancelResponse.result.body.status, "cancelled");
    const remainingChild = await Booking.findOne({ id: cancellableResponse.result.body.bookingIds[1] });
    assert.equal(remainingChild.status, "pending");
    assert.equal(await BookingSlot.countDocuments({ bookingId: { $in: cancellableResponse.result.body.bookingIds } }), 2);
    assert.equal((await BookingGroup.findOne({ id: cancellableResponse.result.body.bookingGroupId })).status, "pending");

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
    const rescheduleMember = await Booking.findOne({ id: groupedResponse.result.body.id });
    const surchargeRequest = await requestBookingReschedule({
      booking: rescheduleMember,
      input: { newFieldId: 10, newCourtId: 11, newDate: "2030-05-01", newTime: "08:00", newDuration: 1.5, reason: "Đổi lịch có phụ thu" },
      user: { id: 50, role: "user" },
    });
    assert.equal(surchargeRequest.status, "requires_payment");
    assert.equal(surchargeRequest.adjustment.paymentDelta, 150000);
    assert.equal((await Booking.findOne({ id: rescheduleMember.id })).date, "2030-01-05");
    assert.equal(await BookingSlot.countDocuments({ bookingId: rescheduleMember.id, date: "2030-01-05" }), 6);

    await Payment.create({
      bookingId: rescheduleMember.id,
      bookingGroupId: groupId,
      adjustmentId: surchargeRequest.adjustment.id,
      paymentCode: "group_reschedule_adjustment",
      gateway: "vnpay",
      paymentKind: "adjustment",
      amount: 150000,
      status: "pending",
    });
    const surchargePayment = await processVnpayCallback(
      signedQuery("group_reschedule_adjustment", 150000, "TXNADJ01")
    );
    assert.equal(surchargePayment.state, "success");
    const rescheduledMember = await Booking.findOne({ id: rescheduleMember.id });
    assert.equal(rescheduledMember.date, "2030-05-01");
    assert.equal(rescheduledMember.duration, 1.5);
    assert.equal(rescheduledMember.total, 450000);
    assert.equal(await BookingSlot.countDocuments({ bookingId: rescheduleMember.id, date: "2030-01-05" }), 0);
    assert.equal(await BookingSlot.countDocuments({ bookingId: rescheduleMember.id, date: "2030-05-01" }), 9);

    const refundDifference = await requestBookingReschedule({
      booking: rescheduledMember,
      input: { newFieldId: 10, newCourtId: 11, newDate: "2030-05-02", newTime: "08:00", newDuration: 1, reason: "Đổi sang buổi rẻ hơn" },
      user: { id: 50, role: "user" },
    });
    assert.equal(refundDifference.status, "refund_pending");
    assert.equal(refundDifference.adjustment.paymentDelta, -150000);
    const cheaperMember = await Booking.findOne({ id: rescheduleMember.id });
    assert.equal(cheaperMember.refundStatus, "pending");
    assert.equal(cheaperMember.refundAmount, 150000);
    const rescheduleRefundResponse = responseRecorder();
    await completeRefund({ user: { id: 900, role: "admin" }, params: { id: String(cheaperMember.id) } }, rescheduleRefundResponse.res);
    assert.equal(rescheduleRefundResponse.result.statusCode, 200);
    assert.equal(rescheduleRefundResponse.result.body.status, "confirmed");
    assert.equal(rescheduleRefundResponse.result.body.refundStatus, "completed");

    const postRefundMember = await Booking.findOne({ id: cheaperMember.id });
    await assert.rejects(
      requestBookingReschedule({
        booking: postRefundMember,
        input: { newFieldId: 10, newCourtId: 11, newDate: "2030-01-12", newTime: "08:00", newDuration: 1, reason: "Xung đột" },
        user: { id: 50, role: "user" },
      }),
      /người khác đặt/
    );
    assert.equal((await Booking.findOne({ id: rescheduleMember.id })).date, "2030-05-02");
    assert.equal(await BookingHistory.countDocuments({ bookingId: rescheduleMember.id, changeType: "reschedule" }), 2);
    assert.equal(await BookingHistory.countDocuments({ bookingId: rescheduleMember.id, changeType: "payment", reason: "adjustment_paid" }), 1);

    const lateConflictRequest = await requestBookingReschedule({
      booking: await Booking.findOne({ id: rescheduleMember.id }),
      input: { newFieldId: 10, newCourtId: 11, newDate: "2030-06-01", newTime: "08:00", newDuration: 1.5, reason: "late_conflict" },
      user: { id: 50, role: "user" },
    });
    assert.equal(lateConflictRequest.status, "requires_payment");
    await BookingSlot.create({ bookingId: 998, courtId: 11, date: "2030-06-01", time: "08:00" });
    await Payment.create({
      bookingId: rescheduleMember.id, bookingGroupId: groupId, adjustmentId: lateConflictRequest.adjustment.id,
      paymentCode: "group_reschedule_late_conflict", gateway: "vnpay", paymentKind: "adjustment",
      amount: lateConflictRequest.adjustment.paymentDelta, status: "pending",
    });
    const lateConflictPayment = await processVnpayCallback(signedQuery("group_reschedule_late_conflict", lateConflictRequest.adjustment.paymentDelta, "TXNADJ02"));
    assert.equal(lateConflictPayment.state, "refund_pending");
    assert.equal((await Booking.findOne({ id: rescheduleMember.id })).date, "2030-05-02");
    assert.equal((await Payment.findOne({ paymentCode: "group_reschedule_late_conflict" })).status, "refund_pending");

    await Booking.create({
      id: 399,
      fieldId: 10,
      courtId: 11,
      fieldName: "Cơ sở ba sân",
      court: "Sân 1",
      date: "2020-01-01",
      time: "08:00",
      duration: 1,
      total: 100000,
      customer: { fullName: "Khách cũ", phone: "0900000399", userId: 50 },
      paymentMethod: "full",
      paymentStatus: "paid",
      status: "confirmed",
    });
    await assert.rejects(
      requestBookingReschedule({
        booking: await Booking.findOne({ id: 399 }),
        input: { newDate: "2030-06-01", newTime: "08:00", newDuration: 1, newCourtId: 11, newFieldId: 10 },
        user: { id: 50, role: "user" },
      }),
      /đã qua/
    );
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

    const createVoucherResponse = responseRecorder();
    await createVoucher({ body: { code: " step6_10 ", type: "percent", discount: 10, limit: 2, status: "active", startsAt: "2020-01-01T00:00:00.000Z", endsAt: "2031-12-31T23:59:59.999Z" } }, createVoucherResponse.res);
    assert.equal(createVoucherResponse.result.statusCode, 201);
    assert.equal(createVoucherResponse.result.body.code, "STEP6_10");

    const duplicateVoucherResponse = responseRecorder();
    await createVoucher({ body: { code: "step6_10", type: "percent", discount: 10, limit: 2, status: "active" } }, duplicateVoucherResponse.res);
    assert.equal(duplicateVoucherResponse.result.statusCode, 409);

    const invalidVoucherResponse = responseRecorder();
    await createVoucher({ body: { code: "BAD_PERCENT", type: "percent", discount: 101, limit: 1, status: "active" } }, invalidVoucherResponse.res);
    assert.equal(invalidVoucherResponse.result.statusCode, 400);

    const validateVoucherResponse = responseRecorder();
    await validateVoucher({ body: { code: "step6_10", subtotal: 300000 } }, validateVoucherResponse.res);
    assert.equal(validateVoucherResponse.result.statusCode, 200);
    assert.equal(validateVoucherResponse.result.body.discountAmount, 30000);

    await Voucher.create({ id: 99, code: "EXPIRED", type: "fixed", discount: 20000, limit: 10, used: 0, status: "active", endsAt: new Date(Date.now() - 60000) });
    const expiredVoucherResponse = responseRecorder();
    await validateVoucher({ body: { code: "expired", subtotal: 100000 } }, expiredVoucherResponse.res);
    assert.equal(expiredVoucherResponse.result.statusCode, 400);
    assert.equal(expiredVoucherResponse.result.body.message, "Mã khuyến mãi đã hết hạn");

    const voucherBookingResponse = responseRecorder();
    await createBooking({
      user: { id: 71, email: "voucher@example.com", fullName: "Khách voucher", role: "user" },
      body: { fieldId: 10, courtId: 11, date: "2030-04-07", time: "12:00", duration: 1, customer: { fullName: "Khách voucher", phone: "0944444444" }, services: [], paymentMethod: "cash", voucherCode: "step6_10", total: 1 },
    }, voucherBookingResponse.res);
    assert.equal(voucherBookingResponse.result.statusCode, 201);
    assert.equal(voucherBookingResponse.result.body.groupTotal, 90000);
    assert.equal(voucherBookingResponse.result.body.discount, 10000);
    assert.equal((await Voucher.findOne({ code: "STEP6_10" })).used, 1);

    const cancelVoucherBookingResponse = responseRecorder();
    await cancelBooking({ user: { id: 71, role: "user" }, params: { id: String(voucherBookingResponse.result.body.id) }, body: {} }, cancelVoucherBookingResponse.res);
    assert.equal(cancelVoucherBookingResponse.result.statusCode, 200);
    assert.equal((await Voucher.findOne({ code: "STEP6_10" })).used, 0);

    const expiringVoucherBookingResponse = responseRecorder();
    await createBooking({
      user: { id: 71, email: "voucher@example.com", fullName: "Khách voucher", role: "user" },
      body: { fieldId: 10, courtId: 11, date: "2030-04-08", time: "13:00", duration: 1, customer: { fullName: "Khách voucher", phone: "0944444444" }, services: [], paymentMethod: "full", voucherCode: "STEP6_10" },
    }, expiringVoucherBookingResponse.res);
    assert.equal(expiringVoucherBookingResponse.result.statusCode, 201);
    await Booking.updateMany({ bookingGroupId: expiringVoucherBookingResponse.result.body.bookingGroupId }, { $set: { paymentExpiresAt: new Date(Date.now() - 1000) } });
    await expirePendingPayments();
    await expirePendingPayments();
    assert.equal((await Voucher.findOne({ code: "STEP6_10" })).used, 0);

    await Voucher.create({ id: 100, code: "FREE100", type: "percent", discount: 100, limit: 1, used: 0, status: "active" });
    const freeVoucherBookingResponse = responseRecorder();
    await createBooking({
      user: { id: 72, email: "free@example.com", fullName: "Khách miễn phí", role: "user" },
      body: { fieldId: 10, courtId: 11, date: "2030-04-09", time: "14:00", duration: 1, customer: { fullName: "Khách miễn phí", phone: "0933333333" }, services: [], paymentMethod: "full", voucherCode: "free100" },
    }, freeVoucherBookingResponse.res);
    assert.equal(freeVoucherBookingResponse.result.statusCode, 201);
    assert.equal(freeVoucherBookingResponse.result.body.groupTotal, 0);
    assert.equal(freeVoucherBookingResponse.result.body.paymentStatus, "paid");
    assert.equal(freeVoucherBookingResponse.result.body.status, "confirmed");
    assert.equal(freeVoucherBookingResponse.result.body.paymentExpiresAt, null);

    const cancellationCases = [
      { id: 300, offsetMinutes: 181, role: "user", expectedAmount: 100000, expectedRate: 100, expectedReason: "customer_early_100", body: { refundBank: "VCB", refundStk: "001" } },
      { id: 301, offsetMinutes: 61, role: "user", expectedAmount: 50000, expectedRate: 50, expectedReason: "customer_late_50", body: { refundBank: "VCB", refundStk: "002", cancellationType: "maintenance" } },
      { id: 302, offsetMinutes: -1, role: "user", expectedStatus: 409, expectedAmount: 0, expectedRate: 0, expectedReason: "customer_no_refund", body: {} },
      { id: 303, offsetMinutes: 61, role: "manager", expectedAmount: 100000, expectedRate: 100, expectedReason: "maintenance", body: { cancellationType: "maintenance" } },
    ];
    for (const testCase of cancellationCases) {
      const schedule = localDateTimeFromNow(testCase.offsetMinutes);
      await Booking.create({
        id: testCase.id, fieldId: 10, courtId: 11, fieldName: "Cơ sở ba sân", court: "Sân 1",
        date: schedule.date, time: schedule.time, duration: 1, total: 100000, paidAmount: 100000,
        customer: { fullName: "Khách chính sách", phone: "0955555555", userId: 70 },
        paymentMethod: "full", paymentStatus: "paid", status: "confirmed",
      });
      await BookingSlot.create({ bookingId: testCase.id, courtId: 11, date: schedule.date, time: schedule.time });
      if (testCase.id === 303) {
        await Payment.create({ bookingId: 303, paymentCode: "303_full_original", transactionCode: "TXN303", gateway: "vnpay", bankCode: "NCB", paymentKind: "full", amount: 100000, status: "success", paidAt: new Date() });
      }
      const cancelPolicyResponse = responseRecorder();
      await cancelBooking({
        user: { id: testCase.role === "user" ? 70 : 900, role: testCase.role },
        params: { id: String(testCase.id) },
        body: testCase.body,
      }, cancelPolicyResponse.res);
      assert.equal(cancelPolicyResponse.result.statusCode, testCase.expectedStatus || 200);
      if (testCase.expectedStatus) {
        assert.equal(await BookingSlot.countDocuments({ bookingId: testCase.id }), 1);
        continue;
      }
      assert.equal(cancelPolicyResponse.result.body.refundAmount, testCase.expectedAmount);
      assert.equal(cancelPolicyResponse.result.body.refundRate, testCase.expectedRate);
      assert.equal(cancelPolicyResponse.result.body.refundReason, testCase.expectedReason);
      assert.equal(cancelPolicyResponse.result.body.refundStatus, testCase.expectedAmount > 0 ? "pending" : "none");
      assert.equal(await BookingSlot.countDocuments({ bookingId: testCase.id }), 0);
    }

    const refundRequestsResponse = responseRecorder();
    await getRefundRequests({}, refundRequestsResponse.res);
    const operationalRefund = refundRequestsResponse.result.body.find((booking) => booking.id === 303);
    assert.equal(operationalRefund.refundTransactionCode, "TXN303");
    assert.equal(operationalRefund.refundPaymentCode, "303_full_original");
    assert.equal(operationalRefund.refundGateway, "vnpay");
    assert.equal(operationalRefund.refundPayments[0].amount, 100000);

    const partialRefundResponse = responseRecorder();
    await completeRefund({ params: { id: "301" } }, partialRefundResponse.res);
    assert.equal(partialRefundResponse.result.statusCode, 200);
    assert.equal(partialRefundResponse.result.body.paymentStatus, "partially_refunded");

    const email = buildPaymentConfirmationEmail(
      { ...paidBooking.toObject(), customer: { fullName: "<script>alert(1)</script>", phone: "0900000000" } },
      { paymentKind: "full", amount: 100000, paymentCode: "test" }
    );
    assert(!email.html.includes("<script>"));
    assert(email.html.includes("&lt;script&gt;"));

    const cashEmail = buildCashBookingEmail({
      id: 500,
      fieldName: "Cơ sở Test",
      court: "Sân A",
      date: "2030-01-01",
      time: "08:00",
      total: 100000,
      groupTotal: 200000,
      customer: { fullName: "Khách đặt tiền mặt" },
      schedule: [
        { date: "2030-01-01", time: "08:00", duration: 1, total: 100000 },
        { date: "2030-01-08", time: "08:00", duration: 1, total: 100000 },
      ],
    });
    assert(cashEmail.subject.includes("thanh toán tại sân"));
    assert(cashEmail.html.includes("LỊCH 2 BUỔI"));

    const complimentaryEmail = buildComplimentaryBookingEmail({
      id: 501,
      fieldName: "Cơ sở Test",
      court: "Sân A",
      date: "2030-01-01",
      time: "08:00",
      total: 0,
      groupTotal: 0,
      voucherCode: "FREE100",
      customer: { fullName: "Khách voucher" },
    });
    assert(complimentaryEmail.subject.includes("đã được xác nhận"));
    assert(complimentaryEmail.html.includes("FREE100"));

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
