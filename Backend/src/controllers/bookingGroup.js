import Booking from "../models/Booking";
import BookingGroup from "../models/BookingGroup";
import BookingHistory from "../models/BookingHistory";
import BookingAdjustment from "../models/BookingAdjustment";
import Payment from "../models/Payment";
import { serialize, serializeMany } from "../utils/serialize";
import { createBooking, cancelBooking } from "./booking";
import {
  appendBookingHistory,
  applyPaidAdjustment,
  canAccessGroup,
  requestBookingReschedule,
} from "../services/bookingGroupService";

async function loadGroupAndChild(req, res) {
  const group = await BookingGroup.findOne({ id: String(req.params.id) });
  if (!group) {
    res.status(404).json({ status: "failed", message: "Không tìm thấy nhóm đặt sân" });
    return null;
  }
  const childId = Number(req.params.childId);
  const child = Number.isFinite(childId)
    ? await Booking.findOne({ id: childId, bookingGroupId: group.id })
    : null;
  if (req.params.childId && !child) {
    res.status(404).json({ status: "failed", message: "Không tìm thấy buổi đặt sân trong nhóm này" });
    return null;
  }
  if (!canAccessGroup(req.user, group, child)) {
    res.status(403).json({ status: "failed", message: "Bạn không có quyền thao tác nhóm đặt sân này" });
    return null;
  }
  return { group, child };
}

export async function createBookingGroup(req, res) {
  return createBooking(req, res);
}

export async function getBookingGroup(req, res) {
  try {
    const loaded = await loadGroupAndChild(req, res);
    if (!loaded) return;
    const children = await Booking.find({ bookingGroupId: loaded.group.id }).sort({ date: 1, time: 1, id: 1 });
    const payments = await Payment.find({ bookingGroupId: loaded.group.id }).sort({ createdAt: -1 });
    const adjustments = await BookingAdjustment.find({ bookingGroupId: loaded.group.id }).sort({ createdAt: -1 });
    return res.json({
      status: "success",
      group: serialize(loaded.group),
      childBookings: serializeMany(children),
      payments: payments.map((payment) => ({ paymentCode: payment.paymentCode, transactionCode: payment.transactionCode, gateway: payment.gateway, paymentKind: payment.paymentKind, amount: payment.amount, currency: payment.currency, status: payment.status, paidAt: payment.paidAt, createdAt: payment.createdAt })),
      adjustments: serializeMany(adjustments),
    });
  } catch (error) {
    return res.status(500).json({ status: "failed", message: error.message });
  }
}

export async function rescheduleBookingChild(req, res) {
  try {
    const loaded = await loadGroupAndChild(req, res);
    if (!loaded) return;
    const result = await requestBookingReschedule({
      booking: loaded.child,
      input: req.body,
      user: req.user,
    });
    return res.json({
      status: result.status,
      message: result.status === "requires_payment"
        ? "Cần thanh toán phụ thu trước khi đổi lịch. Đơn cũ vẫn được giữ nguyên."
        : result.status === "refund_pending"
          ? "Đổi lịch thành công, phần chênh lệch đang chờ hoàn tiền."
          : "Đổi lịch thành công.",
      booking: serialize(result.booking),
      adjustment: serialize(result.adjustment),
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      status: "failed",
      message: error.message || "Đổi giờ thất bại, đơn cũ đã được giữ nguyên",
    });
  }
}

export async function cancelBookingChild(req, res) {
  try {
    const loaded = await loadGroupAndChild(req, res);
    if (!loaded) return;
    req.params.id = String(loaded.child.id);
    return cancelBooking(req, res);
  } catch (error) {
    return res.status(400).json({ status: "failed", message: error.message });
  }
}

export async function getBookingGroupHistory(req, res) {
  try {
    const loaded = await loadGroupAndChild(req, res);
    if (!loaded) return;
    const history = await BookingHistory.find({ bookingGroupId: loaded.group.id }).sort({ changedAt: -1 });
    return res.json({ status: "success", history: serializeMany(history) });
  } catch (error) {
    return res.status(500).json({ status: "failed", message: error.message });
  }
}

export async function adjustBookingGroupPayment(req, res) {
  try {
    const loaded = await loadGroupAndChild(req, res);
    if (!loaded) return;
    const adjustment = await BookingAdjustment.findOne({
      id: String(req.body.adjustmentId || ""),
      bookingGroupId: loaded.group.id,
    });
    if (!adjustment) {
      return res.status(404).json({ status: "failed", message: "Không tìm thấy khoản điều chỉnh" });
    }
    if (req.body.action !== "confirm") {
      return res.json({ status: adjustment.status, adjustment: serialize(adjustment) });
    }
    if (!["admin", "manager"].includes(req.user?.role)) {
      return res.status(403).json({ status: "failed", message: "Chỉ quản lý được xác nhận phụ thu thủ công" });
    }
    const result = await applyPaidAdjustment(adjustment.id);
    await Payment.findOneAndUpdate(
      { paymentCode: `MANUAL_${adjustment.id}` },
      { bookingId: adjustment.bookingId, bookingGroupId: adjustment.bookingGroupId, adjustmentId: adjustment.id, paymentCode: `MANUAL_${adjustment.id}`, gateway: "manual", paymentKind: "adjustment", amount: adjustment.paymentDelta, status: "success", paidAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await appendBookingHistory({ booking: result.booking, changeType: "payment", user: req.user, reason: "manual_adjustment_paid", after: { adjustmentId: adjustment.id }, paymentDelta: adjustment.paymentDelta, statusBefore: result.booking.status, statusAfter: result.booking.status });
    return res.json({
      status: "success",
      message: "Đã xác nhận phụ thu và áp dụng lịch mới",
      booking: serialize(result.booking),
      adjustment: serialize(result.adjustment),
    });
  } catch (error) {
    return res.status(409).json({
      status: "failed",
      message: `${error.message || "Điều chỉnh thất bại"}. Đơn cũ vẫn được giữ nguyên.`,
    });
  }
}
