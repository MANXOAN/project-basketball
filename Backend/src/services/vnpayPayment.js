import crypto from "crypto";
import qs from "qs";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
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

  const updatedBooking = await Booking.findOneAndUpdate(
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
