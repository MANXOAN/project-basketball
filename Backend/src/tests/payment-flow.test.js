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
import Voucher from "../models/Voucher";
import { cancelBooking, completeRefund, createBooking, expirePendingPayments, extendBooking, getBookingDetail, getRefundRequests, rescheduleBooking } from "../controllers/booking";
import { processVnpayCallback } from "../services/vnpayPayment";
import { buildCashBookingEmail, buildPaymentConfirmationEmail } from "../utils/bookingEmail";
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

    await Booking.create({
      id: 900,
      bookingGroupId: "EXT_GROUP_900",
      fieldId: 10,
      courtId: 11,
      fieldName: "Cơ sở ba sân",
      court: "Sân 1",
      date: "2030-06-01",
      time: "08:00",
      duration: 1,
      total: 100000,
      groupTotal: 100000,
      groupSize: 1,
      customer: { fullName: "Khách gia hạn", phone: "0900000900", userId: 90 },
      paymentMethod: "full",
      paymentStatus: "paid",
      paidAmount: 100000,
      status: "confirmed",
    });
    await BookingGroup.create({
      id: "EXT_GROUP_900", primaryBookingId: 900, bookingIds: [900], mode: "single",
      total: 100000, paidAmount: 100000, paymentStatus: "paid", status: "confirmed", userId: 90,
    });
    await BookingSlot.insertMany([
      { bookingId: 900, courtId: 11, date: "2030-06-01", time: "08:00" },
      { bookingId: 900, courtId: 11, date: "2030-06-01", time: "08:30" },
    ]);
    const extensionResponse = responseRecorder();
    await extendBooking({ user: { id: 90, role: "user" }, params: { id: "900" } }, extensionResponse.res);
    assert.equal(extensionResponse.result.statusCode, 200);
    assert.equal(extensionResponse.result.body.id, 900);
    assert.equal(extensionResponse.result.body.duration, 2);
    assert.equal(extensionResponse.result.body.extensionHours, 1);
    assert.equal(extensionResponse.result.body.total, 200000);
    assert.equal(extensionResponse.result.body.paidAmount, 100000);
    assert.equal(extensionResponse.result.body.paymentStatus, "deposit_paid");
    assert.equal(await Booking.countDocuments({ bookingGroupId: "EXT_GROUP_900" }), 1);
    assert.equal(await BookingSlot.countDocuments({ bookingId: 900 }), 4);
    const extendedGroup = await BookingGroup.findOne({ id: "EXT_GROUP_900" });
    assert.equal(extendedGroup.total, 200000);
    assert.equal(extendedGroup.paymentStatus, "deposit_paid");

    await Booking.create({
      id: 903,
      bookingGroupId: "EXT_GROUP_903",
      fieldId: 10,
      courtId: 11,
      date: "2030-06-03",
      time: "13:00",
      duration: 1,
      total: 100000,
      groupTotal: 100000,
      groupSize: 1,
      customer: { fullName: "Khách link cũ", phone: "0900000903", userId: 93 },
      paymentMethod: "full",
      paymentStatus: "unpaid",
      status: "pending",
    });
    await BookingGroup.create({
      id: "EXT_GROUP_903", primaryBookingId: 903, bookingIds: [903], mode: "single",
      total: 100000, paymentStatus: "unpaid", status: "pending", userId: 93,
    });
    await BookingSlot.insertMany([
      { bookingId: 903, courtId: 11, date: "2030-06-03", time: "13:00" },
      { bookingId: 903, courtId: 11, date: "2030-06-03", time: "13:30" },
    ]);
    await Payment.create({
      bookingId: 903, bookingGroupId: "EXT_GROUP_903", paymentCode: "903_full_stale",
      gateway: "vnpay", paymentKind: "full", amount: 100000, status: "pending",
    });
    const unpaidExtensionResponse = responseRecorder();
    await extendBooking({ user: { id: 93, role: "user" }, params: { id: "903" } }, unpaidExtensionResponse.res);
    assert.equal(unpaidExtensionResponse.result.statusCode, 200);
    const staleLinkResult = await processVnpayCallback(signedQuery("903_full_stale", 100000, "TXN_EXTENSION_STALE"));
    assert.equal(staleLinkResult.state, "refund_pending");
    assert.equal((await Booking.findOne({ id: 903 })).paymentStatus, "unpaid");

    await Booking.create({
      id: 901, fieldId: 10, courtId: 11, date: "2030-06-02", time: "11:00", duration: 1,
      total: 100000, customer: { fullName: "Khách bị kín giờ", phone: "0900000901", userId: 91 },
      paymentMethod: "cash", paymentStatus: "unpaid", status: "pending",
    });
    await BookingSlot.create({ bookingId: 902, courtId: 11, date: "2030-06-02", time: "12:00" });
    const blockedExtensionResponse = responseRecorder();
    await extendBooking({ user: { id: 91, role: "user" }, params: { id: "901" } }, blockedExtensionResponse.res);
    assert.equal(blockedExtensionResponse.result.statusCode, 409);
    assert.equal((await Booking.findOne({ id: 901 })).duration, 1);
    assert.equal(await BookingSlot.countDocuments({ bookingId: 901 }), 0);

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

    const fullFieldMoveResponse = responseRecorder();
    await rescheduleBooking({
      user: { id: 50, role: "user" },
      params: { id: String(groupedResponse.result.body.bookingIds[4]) },
      body: { date: "2030-02-16", time: "10:00" },
    }, fullFieldMoveResponse.res);
    assert.equal(fullFieldMoveResponse.result.statusCode, 200);
    assert.equal(await BookingSlot.countDocuments({ bookingId: groupedResponse.result.body.bookingIds[4], date: "2030-02-09" }), 0);
    assert.equal(await BookingSlot.countDocuments({ bookingId: groupedResponse.result.body.bookingIds[4], date: "2030-02-16" }), 6);

    const dailyBookingResponse = responseRecorder();
    await createBooking({
      user: { id: 53, email: "daily@example.com", fullName: "Khách đặt mỗi ngày", role: "user" },
      body: {
        fieldId: 10,
        courtId: 11,
        scheduleSegments: [{ startDate: "2030-05-04", endDate: "2030-05-10", time: "16:00", frequency: "daily" }],
        duration: 1,
        customer: { fullName: "Khách đặt mỗi ngày", phone: "0950000000" },
        services: [],
        paymentMethod: "cash",
      },
    }, dailyBookingResponse.res);
    assert.equal(dailyBookingResponse.result.statusCode, 201);
    assert.equal(dailyBookingResponse.result.body.groupSize, 7);
    assert.deepEqual(dailyBookingResponse.result.body.schedule.map((item) => item.date), [
      "2030-05-04", "2030-05-05", "2030-05-06", "2030-05-07", "2030-05-08", "2030-05-09", "2030-05-10",
    ]);
    assert.equal(await BookingSlot.countDocuments({ bookingId: { $in: dailyBookingResponse.result.body.bookingIds } }), 14);

    const sameDaySessionsResponse = responseRecorder();
    await createBooking({
      user: { id: 56, email: "sameday@example.com", fullName: "Khách nhiều ca", role: "user" },
      body: {
        fieldId: 10,
        courtId: 11,
        date: "2030-06-22",
        time: "14:00",
        duration: 1,
        scheduleOccurrences: [
          { date: "2030-06-22", time: "14:00", duration: 1 },
          { date: "2030-06-22", time: "16:00", duration: 1 },
          { date: "2030-06-22", time: "19:00", duration: 1 },
        ],
        customer: { fullName: "Khách nhiều ca", phone: "0960000001" },
        services: [],
        paymentMethod: "deposit",
      },
    }, sameDaySessionsResponse.res);
    assert.equal(sameDaySessionsResponse.result.statusCode, 201);
    assert.equal(sameDaySessionsResponse.result.body.groupSize, 3);
    assert.equal(sameDaySessionsResponse.result.body.groupTotal, 300000);
    assert.deepEqual(sameDaySessionsResponse.result.body.schedule.map((session) => session.time), ["14:00", "16:00", "19:00"]);
    assert.equal(await Booking.countDocuments({ bookingGroupId: sameDaySessionsResponse.result.body.bookingGroupId }), 3);

    const editedScheduleResponse = responseRecorder();
    await createBooking({
      user: { id: 54, email: "edited@example.com", fullName: "Khách sửa lịch", role: "user" },
      body: {
        fieldId: 10,
        courtId: 11,
        scheduleSegments: [{ startDate: "2030-05-12", endDate: "2030-05-14", time: "09:00", frequency: "daily" }],
        scheduleOccurrences: [
          { date: "2030-05-12", time: "09:00", duration: 1 },
          { date: "2030-05-13", time: "15:30", duration: 1.5 },
          { date: "2030-05-14", time: "09:00", duration: 2 },
        ],
        duration: 1,
        customer: { fullName: "Khách sửa lịch", phone: "0950000001" },
        services: [],
        paymentMethod: "cash",
      },
    }, editedScheduleResponse.res);
    assert.equal(editedScheduleResponse.result.statusCode, 201);
    assert.equal(editedScheduleResponse.result.body.groupSize, 3);
    assert.equal(editedScheduleResponse.result.body.groupTotal, 450000);
    assert.equal(editedScheduleResponse.result.body.schedule[1].time, "15:30");
    const durationBookings = await Booking.find({ bookingGroupId: editedScheduleResponse.result.body.bookingGroupId }).sort({ date: 1 });
    assert.deepEqual(durationBookings.map((booking) => booking.duration), [1, 1.5, 2]);
    assert.deepEqual(durationBookings.map((booking) => booking.total), [100000, 150000, 200000]);
    assert.equal(await BookingSlot.countDocuments({ bookingId: { $in: editedScheduleResponse.result.body.bookingIds } }), 9);
    await Payment.create({
      bookingId: durationBookings[0].id,
      bookingGroupId: editedScheduleResponse.result.body.bookingGroupId,
      paymentCode: "duration_group_deposit",
      gateway: "vnpay",
      paymentKind: "deposit",
      amount: 135000,
      status: "pending",
    });
    const durationDepositResult = await processVnpayCallback(
      signedQuery("duration_group_deposit", 135000, "TXNDURATION01")
    );
    assert.equal(durationDepositResult.state, "success");
    const depositDurationBookings = await Booking.find({ bookingGroupId: editedScheduleResponse.result.body.bookingGroupId }).sort({ date: 1 });
    assert.deepEqual(depositDurationBookings.map((booking) => booking.paidAmount), [30000, 45000, 60000]);

    await Court.create({ id: 14, fieldId: 10, name: "Sân 130k", type: "Bóng rổ 5x5", price: 130000, status: "active" });
    const longTermDepositResponse = responseRecorder();
    await createBooking({
      user: { id: 55, email: "longterm@example.com", fullName: "Khách dài hạn", role: "user" },
      body: {
        fieldId: 10,
        courtId: 14,
        scheduleOccurrences: [
          { date: "2030-06-01", time: "10:00", duration: 1 },
          { date: "2030-06-08", time: "10:00", duration: 1.5 },
          { date: "2030-06-15", time: "10:00", duration: 1.5 },
        ],
        duration: 1,
        customer: { fullName: "Khách dài hạn", phone: "0960000000" },
        services: [],
        paymentMethod: "deposit",
      },
    }, longTermDepositResponse.res);
    assert.equal(longTermDepositResponse.result.statusCode, 201);
    assert.equal(longTermDepositResponse.result.body.groupSize, 3);
    assert.equal(longTermDepositResponse.result.body.groupTotal, 520000);

    const longTermMembers = await Booking.find({ bookingGroupId: longTermDepositResponse.result.body.bookingGroupId }).sort({ date: 1 });
    await Payment.create({
      bookingId: longTermMembers[0].id,
      bookingGroupId: longTermDepositResponse.result.body.bookingGroupId,
      paymentCode: "longterm_group_deposit",
      gateway: "vnpay",
      paymentKind: "deposit",
      amount: 156000,
      status: "pending",
    });
    const longTermPaymentResult = await processVnpayCallback(
      signedQuery("longterm_group_deposit", 156000, "TXNLONGTERM01")
    );
    assert.equal(longTermPaymentResult.state, "success");
    const paidLongTermGroup = await BookingGroup.findOne({ id: longTermDepositResponse.result.body.bookingGroupId });
    assert.equal(paidLongTermGroup.paidAmount, 156000);
    const paidLongTermMembers = await Booking.find({ bookingGroupId: longTermDepositResponse.result.body.bookingGroupId }).sort({ date: 1 });
    assert.deepEqual(paidLongTermMembers.map((booking) => booking.paidAmount), [39000, 58500, 58500]);

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
    const remainingBookingId = cancellableResponse.result.body.bookingIds.find((id) => id !== cancelResponse.result.body.id);
    assert.equal(await BookingSlot.countDocuments({ bookingId: cancelResponse.result.body.id }), 0);
    assert((await BookingSlot.countDocuments({ bookingId: remainingBookingId })) > 0);
    assert.equal((await Booking.findOne({ id: remainingBookingId })).status, "pending");
    assert.equal((await BookingGroup.findOne({ id: cancellableResponse.result.body.bookingGroupId })).status, "partially_cancelled");

    const moveResponse = responseRecorder();
    await rescheduleBooking({
      user: { id: 52, role: "user" },
      params: { id: String(remainingBookingId) },
      body: { date: "2030-03-16", time: "12:00" },
    }, moveResponse.res);
    assert.equal(moveResponse.result.statusCode, 200);
    assert.equal(moveResponse.result.body.date, "2030-03-16");
    assert.equal(moveResponse.result.body.time, "12:00");
    assert.equal(await BookingSlot.countDocuments({ bookingId: remainingBookingId, date: "2030-03-09" }), 0);
    assert.equal(await BookingSlot.countDocuments({ bookingId: remainingBookingId, date: "2030-03-16" }), 2);

    const moveConflictResponse = responseRecorder();
    await rescheduleBooking({
      user: { id: 52, role: "user" },
      params: { id: String(remainingBookingId) },
      body: { date: "2030-02-02", time: "17:00" },
    }, moveConflictResponse.res);
    assert.equal(moveConflictResponse.result.statusCode, 409);
    assert.equal((await Booking.findOne({ id: remainingBookingId })).date, "2030-03-16");
    assert.equal(await BookingSlot.countDocuments({ bookingId: remainingBookingId, date: "2030-03-16" }), 2);

    const remainingBooking = await Booking.findOne({ id: remainingBookingId });
    await Payment.create({
      bookingId: remainingBookingId,
      bookingGroupId: cancellableResponse.result.body.bookingGroupId,
      paymentCode: "partial_group_remaining_full",
      gateway: "vnpay",
      paymentKind: "full",
      amount: remainingBooking.total,
      status: "pending",
    });
    const remainingPayment = await processVnpayCallback(
      signedQuery("partial_group_remaining_full", remainingBooking.total, "TXNPARTIAL01")
    );
    assert.equal(remainingPayment.state, "success");
    const partiallyPaidGroup = await BookingGroup.findOne({ id: cancellableResponse.result.body.bookingGroupId });
    assert.equal(partiallyPaidGroup.paidAmount, remainingBooking.total);
    assert.equal(partiallyPaidGroup.status, "partially_cancelled");
    assert.equal((await Booking.findOne({ id: cancellableResponse.result.body.id })).status, "cancelled");
    assert.equal((await Booking.findOne({ id: remainingBookingId })).paymentStatus, "paid");

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

    const cancelledPaidSessionId = groupedResponse.result.body.bookingIds[0];
    const paidSessionCancelResponse = responseRecorder();
    await cancelBooking({
      user: { id: 50, role: "user" },
      params: { id: String(cancelledPaidSessionId) },
      body: { refundBank: "VCB", refundStk: "123456" },
    }, paidSessionCancelResponse.res);
    assert.equal(paidSessionCancelResponse.result.statusCode, 200);
    assert.equal(paidSessionCancelResponse.result.body.status, "cancelled");
    assert.equal(paidSessionCancelResponse.result.body.refundAmount, 300000);
    const stillBookedSessionId = groupedResponse.result.body.bookingIds[1];
    assert.equal((await Booking.findOne({ id: stillBookedSessionId })).status, "confirmed");
    assert.equal((await BookingGroup.findOne({ id: groupId })).status, "partially_cancelled");
    const groupRefundResponse = responseRecorder();
    await getRefundRequests({}, groupRefundResponse.res);
    const groupRefund = groupRefundResponse.result.body.find((item) => item.id === cancelledPaidSessionId);
    assert.equal(groupRefund.refundAmount, 300000);
    assert.equal(groupRefund.refundPayments[0].amount, 1500000);
    assert.equal(groupRefund.refundPayments[0].bookingGroupId, groupId);
    const completeGroupRefundResponse = responseRecorder();
    await completeRefund({ params: { id: String(cancelledPaidSessionId) } }, completeGroupRefundResponse.res);
    assert.equal(completeGroupRefundResponse.result.statusCode, 200);
    assert.equal(completeGroupRefundResponse.result.body.paymentStatus, "refunded");

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

    const groupedVoucherBookingResponse = responseRecorder();
    await createBooking({
      user: { id: 71, email: "voucher@example.com", fullName: "Khách voucher", role: "user" },
      body: {
        fieldId: 10,
        courtId: 11,
        scheduleSegments: [{ startDate: "2030-04-10", endDate: "2030-04-17", time: "15:00" }],
        duration: 1,
        customer: { fullName: "Khách voucher", phone: "0944444444" },
        services: [],
        paymentMethod: "cash",
        voucherCode: "STEP6_10",
      },
    }, groupedVoucherBookingResponse.res);
    assert.equal(groupedVoucherBookingResponse.result.statusCode, 201);
    assert.equal((await Voucher.findOne({ code: "STEP6_10" })).used, 1);
    const cancelVoucherSessionResponse = responseRecorder();
    await cancelBooking({
      user: { id: 71, role: "user" },
      params: { id: String(groupedVoucherBookingResponse.result.body.bookingIds[0]) },
      body: {},
    }, cancelVoucherSessionResponse.res);
    assert.equal(cancelVoucherSessionResponse.result.statusCode, 200);
    assert.equal((await Voucher.findOne({ code: "STEP6_10" })).used, 1);
    assert.equal((await Booking.findOne({ id: groupedVoucherBookingResponse.result.body.bookingIds[1] })).status, "pending");
    const cancelLastVoucherSessionResponse = responseRecorder();
    await cancelBooking({
      user: { id: 71, role: "user" },
      params: { id: String(groupedVoucherBookingResponse.result.body.bookingIds[1]) },
      body: {},
    }, cancelLastVoucherSessionResponse.res);
    assert.equal(cancelLastVoucherSessionResponse.result.statusCode, 200);
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
      { id: 302, offsetMinutes: -1, role: "user", expectedAmount: 0, expectedRate: 0, expectedReason: "customer_no_refund", body: {} },
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
      assert.equal(cancelPolicyResponse.result.statusCode, 200);
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

    const emailGroup = {
      id: 520,
      fieldName: "Green Stadium",
      court: "Sân VIP",
      customer: { fullName: "Khách đặt lịch", email: "group@example.com" },
      groupSize: 3,
      groupTotal: 520000,
      groupPaidAmount: 156000,
      schedule: [
        { id: 521, court: "Sân VIP", date: "2030-06-01", time: "14:00", duration: 1, total: 130000 },
        { id: 522, court: "Sân VIP", date: "2030-06-01", time: "16:00", duration: 1.5, total: 195000 },
        { id: 523, court: "Sân VIP", date: "2030-06-01", time: "19:00", duration: 1.5, total: 195000 },
      ],
    };
    const depositEmail = buildPaymentConfirmationEmail(emailGroup, { paymentKind: "deposit", amount: 156000 });
    assert(depositEmail.subject.includes("cọc 30%"));
    assert(depositEmail.html.includes("156.000 ₫"));
    assert(depositEmail.html.includes("364.000 ₫"));
    assert(depositEmail.html.includes("19:00"));
    assert(depositEmail.html.includes("195.000 ₫"));

    const balanceEmail = buildPaymentConfirmationEmail(
      { ...emailGroup, groupPaidAmount: 520000 },
      { paymentKind: "balance", amount: 364000 }
    );
    assert(balanceEmail.subject.includes("đủ 100%"));
    assert(balanceEmail.html.includes("520.000 ₫"));
    assert(balanceEmail.html.includes("Đã thanh toán đủ 100%"));

    const fullEmail = buildPaymentConfirmationEmail(
      { ...emailGroup, groupPaidAmount: 520000 },
      { paymentKind: "full", amount: 520000 }
    );
    assert(fullEmail.subject.includes("100%"));
    assert(fullEmail.html.includes("520.000 ₫"));

    const cashEmail = buildCashBookingEmail(emailGroup);
    assert(cashEmail.subject.includes("thanh toán tại sân"));
    assert(cashEmail.html.includes("CẦN THANH TOÁN TẠI SÂN"));
    assert(cashEmail.html.includes("520.000 ₫"));
    assert(cashEmail.html.includes("14:00"));

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
