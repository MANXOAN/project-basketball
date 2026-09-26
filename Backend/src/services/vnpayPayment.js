import crypto from "crypto";
import qs from "qs";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import BookingGroup from "../models/BookingGroup";
import { sendMail } from "../utils/mailer";
import {
  buildPaymentConfirmationEmail,
  buildPaymentRefundPendingEmail,
} from "../utils/bookingEmail";

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .map((key) => encodeURIComponent(key))
    .sort()
    .forEach((key) => {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    });
  return sorted;
}

export function verifyVnpaySignature(query, secretKey = process.env.VNP_HASH_SECRET || "") {
  const secureHash = String(query.vnp_SecureHash || "");
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  if (!secretKey || !secureHash) return { valid: false, params };

  const signData = qs.stringify(sortObject(params), { encode: false });
  const signed = crypto
    .createHmac("sha512", secretKey)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
  const valid = secureHash.length === signed.length &&
    crypto.timingSafeEqual(Buffer.from(secureHash), Buffer.from(signed));
  return { valid, params };
}

async function sendPaymentEmail(booking, payment, refundPending) {
  if (!booking.customer?.email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, confirmationEmailSentAt: null, confirmationEmailClaimedAt: null },
    { $set: { confirmationEmailClaimedAt: new Date() } },
    { new: true }
  );
  if (!claimed) return;

  const message = refundPending
    ? buildPaymentRefundPendingEmail(booking, payment)
    : buildPaymentConfirmationEmail(booking, payment);
  const sent = await sendMail(booking.customer.email, message.subject, message.html);
  if (sent) {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { confirmationEmailSentAt: new Date() }, $unset: { confirmationEmailClaimedAt: "" } }
    );
  } else {
    await Payment.updateOne(
      { _id: payment._id },
      { $unset: { confirmationEmailClaimedAt: "" } }
    );
  }
}

function queuePaymentEmail(booking, payment, refundPending) {
  sendPaymentEmail(booking, payment, refundPending).catch((error) => {
    console.error("Payment confirmation email failed:", error.message);
  });
}

function bookingPaymentFilter(bookingId, paymentKind) {
  const filter = { id: bookingId, status: { $ne: "cancelled" } };
  if (paymentKind === "balance") filter.paymentStatus = "deposit_paid";
  else filter.paymentStatus = "unpaid";
  return filter;
}

function paidBookingUpdate(booking, payment) {
  const total = Number(booking.total);
  const nextPaidAmount = payment.paymentKind === "balance"
    ? total
    : Math.min(total, Number(payment.amount));
  return {
    paidAmount: nextPaidAmount,
    paymentStatus: nextPaidAmount >= total ? "paid" : "deposit_paid",
    status: "confirmed",
    paymentExpiresAt: null,
  };
}

function splitAmount(amount, count, index) {
  const whole = Math.max(0, Math.round(Number(amount) || 0));
  const base = Math.floor(whole / count);
  return base + (index < whole % count ? 1 : 0);
}

function allocateAmountByWeights(amount, weights) {
  const whole = Math.max(0, Math.round(Number(amount) || 0));
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, Number(weight) || 0), 0);
  if (!weights.length) return [];
  if (!weightTotal) return weights.map((_weight, index) => splitAmount(whole, weights.length, index));

  const exactShares = weights.map((weight) => whole * Math.max(0, Number(weight) || 0) / weightTotal);
  const shares = exactShares.map(Math.floor);
  let remainder = whole - shares.reduce((sum, share) => sum + share, 0);
  const remainderOrder = exactShares
    .map((share, index) => ({ index, remainder: share - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    shares[remainderOrder[index % remainderOrder.length].index] += 1;
  }
  return shares;
}

async function applyGroupPayment(booking, payment) {
  if (!payment.bookingGroupId) return null;
  const expectedStatus = payment.paymentKind === "balance" ? "deposit_paid" : "unpaid";
  const group = await BookingGroup.findOne({ id: payment.bookingGroupId });
  if (!group) return null;

  const allMembers = await Booking.find({ bookingGroupId: group.id }).sort({ id: 1 });
  const members = allMembers.filter((member) => member.status !== "cancelled");
  if (!members.length) return { claimed: false, booking };
  const activeTotal = members.reduce((sum, member) => sum + Number(member.total || 0), 0);
  const currentPaidAmount = members.reduce((sum, member) => sum + Number(member.paidAmount || 0), 0);
  const expectedAmount = payment.paymentKind === "balance"
    ? Math.max(0, activeTotal - currentPaidAmount)
    : payment.paymentKind === "deposit"
      ? Math.round(activeTotal * 0.3)
      : activeTotal;
  if (Number(payment.amount) !== expectedAmount) return { claimed: false, booking };

  const nextPaymentStatus = payment.paymentKind === "deposit" ? "deposit_paid" : "paid";
  const nextPaidAmount = nextPaymentStatus === "paid"
    ? activeTotal
    : Math.min(activeTotal, Number(payment.amount));
  const claimedGroup = await BookingGroup.findOneAndUpdate(
    { id: group.id, status: { $ne: "cancelled" }, paymentStatus: expectedStatus },
    {
      $set: {
        paymentStatus: nextPaymentStatus,
        paidAmount: nextPaidAmount,
        status: allMembers.some((member) => member.status === "cancelled") ? "partially_cancelled" : "confirmed",
        paymentExpiresAt: null,
      },
    },
    { new: true }
  );
  if (!claimedGroup) return { claimed: false, booking };

  const depositShares = nextPaymentStatus === "paid"
    ? []
    : allocateAmountByWeights(payment.amount, members.map((member) => member.total));
  for (const [index, member] of members.entries()) {
    const memberPaidAmount = nextPaymentStatus === "paid"
      ? Number(member.total)
      : Math.min(Number(member.total), depositShares[index]);
    await Booking.updateOne(
      { id: member.id, status: { $ne: "cancelled" } },
      {
        $set: {
          paidAmount: memberPaidAmount,
          paymentStatus: nextPaymentStatus,
          status: "confirmed",
          paymentExpiresAt: null,
        },
      }
    );
  }
  const activePrimary = members.find((member) => member.id === group.primaryBookingId) || members[0];
  const updatedPrimary = await Booking.findOne({ id: activePrimary.id });
  const emailBooking = updatedPrimary
    ? {
      ...updatedPrimary.toObject(),
      groupTotal: activeTotal,
      groupSize: members.length,
      groupPaidAmount: nextPaidAmount,
      paidAmount: nextPaidAmount,
      paymentStatus: nextPaymentStatus,
      schedule: members.map((member) => ({
        id: member.id,
        fieldName: member.fieldName,
        court: member.court,
        date: member.date,
        time: member.time,
        duration: member.duration,
        total: member.total,
        status: member.status,
      })),
    }
    : booking;
  return { claimed: true, booking: emailBooking };
}

function callbackResult({ payment, booking, state, message, code = "00" }) {
  return {
    ok: code === "00",
    code,
    state,
    message,
    bookingId: String(booking?.id || payment?.bookingId || ""),
  };
}

export async function processVnpayCallback(query) {
  const { valid, params } = verifyVnpaySignature(query);
  if (!valid) {
    return callbackResult({ state: "invalid", message: "Chữ ký VNPay không hợp lệ", code: "97" });
  }

  const paymentCode = String(params.vnp_TxnRef || "");
  const payment = await Payment.findOne({ paymentCode });
  if (!payment) {
    return callbackResult({ state: "not_found", message: "Không tìm thấy giao dịch", code: "01" });
  }

  const booking = await Booking.findOne({ id: payment.bookingId });
  if (!booking) {
    return callbackResult({ payment, state: "not_found", message: "Không tìm thấy đơn đặt sân", code: "01" });
  }

  const callbackAmount = Number(params.vnp_Amount) / 100;
  if (!Number.isInteger(callbackAmount) || callbackAmount !== Number(payment.amount)) {
    return callbackResult({ payment, booking, state: "invalid_amount", message: "Số tiền VNPay không khớp", code: "04" });
  }

  const gatewaySucceeded = String(params.vnp_ResponseCode || "") === "00" &&
    (!params.vnp_TransactionStatus || String(params.vnp_TransactionStatus) === "00");
  const transactionFields = {
    transactionCode: String(params.vnp_TransactionNo || ""),
    bankCode: String(params.vnp_BankCode || ""),
    rawData: params,
  };

  if (!gatewaySucceeded) {
    await Payment.updateOne(
      { _id: payment._id, status: "pending" },
      { $set: { ...transactionFields, status: "failed", failureReason: `vnpay_${params.vnp_ResponseCode || "unknown"}` } }
    );
    return callbackResult({
      payment,
      booking,
      state: "failed",
      message: "Giao dịch chưa thành công",
      code: String(params.vnp_ResponseCode || "99"),
    });
  }

  if (["success", "refund_pending", "refunded"].includes(payment.status)) {
    return callbackResult({
      payment,
      booking,
      state: payment.status,
      message: payment.status === "success" ? "Thanh toán đã được ghi nhận" : "Khoản thanh toán đang được hoàn",
    });
  }

  const claimedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ["pending", "failed"] } },
    { $set: { ...transactionFields, status: "success", paidAt: new Date(), failureReason: "" } },
    { new: true }
  );
  if (!claimedPayment) {
    const current = await Payment.findById(payment._id);
    return callbackResult({
      payment: current || payment,
      booking,
      state: current?.status || "processed",
      message: "Giao dịch đã được xử lý",
    });
  }

  const groupedResult = await applyGroupPayment(booking, claimedPayment);
  const updatedBooking = groupedResult
    ? (groupedResult.claimed ? groupedResult.booking : null)
    : await Booking.findOneAndUpdate(
      bookingPaymentFilter(booking.id, claimedPayment.paymentKind),
      { $set: paidBookingUpdate(booking, claimedPayment) },
      { new: true }
    );

  if (!updatedBooking) {
    const refundPayment = await Payment.findOneAndUpdate(
      { _id: claimedPayment._id },
      { $set: { status: "refund_pending", failureReason: "duplicate_or_expired_payment" } },
      { new: true }
    );
    const refundBooking = await Booking.findOneAndUpdate(
      { id: booking.id },
      {
        $inc: { refundAmount: Number(claimedPayment.amount) },
        $set: { refundStatus: "pending", refundReason: "duplicate_or_expired_payment" },
      },
      { new: true }
    );
    queuePaymentEmail(refundBooking || booking, refundPayment || claimedPayment, true);
    return callbackResult({
      payment: refundPayment || claimedPayment,
      booking: refundBooking || booking,
      state: "refund_pending",
      message: "Khoản thanh toán dư hoặc quá hạn đã được đưa vào hàng chờ hoàn tiền",
    });
  }

  queuePaymentEmail(updatedBooking, claimedPayment, false);
  return callbackResult({
    payment: claimedPayment,
    booking: updatedBooking,
    state: "success",
    message: "Thanh toán thành công",
  });
}
