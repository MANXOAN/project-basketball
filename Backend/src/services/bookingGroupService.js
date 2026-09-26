import Booking from "../models/Booking";
import BookingGroup from "../models/BookingGroup";
import BookingSlot from "../models/BookingSlot";
import BookingHistory from "../models/BookingHistory";
import BookingAdjustment from "../models/BookingAdjustment";
import Court from "../models/Court";
import Field from "../models/Field";

function toMin(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}

function startMs(date, time) {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time).split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);
}

function slotTimes(time, duration) {
  const slots = [];
  const start = toMin(time);
  for (let index = 0; index < Math.ceil(Number(duration) * 2); index += 1) {
    const minute = start + index * 30;
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return slots;
}

function sourceFor(user) {
  return ["admin", "manager"].includes(user?.role) ? user.role : user?.id ? "user" : "system";
}

function snapshot(booking) {
  return {
    fieldId: booking.fieldId,
    courtId: booking.courtId,
    court: booking.court,
    reservedCourtIds: booking.reservedCourtIds || [],
    date: booking.date,
    time: booking.time,
    duration: booking.duration,
    total: booking.total,
    fieldName: booking.fieldName,
    paidAmount: booking.paidAmount,
    refundAmount: booking.refundAmount,
    refundStatus: booking.refundStatus,
    refundReason: booking.refundReason,
    pendingAdjustmentId: booking.pendingAdjustmentId,
  };
}

export function canAccessGroup(user, group, booking) {
  if (["admin", "manager"].includes(user?.role)) return true;
  return Number(group?.userId ?? booking?.customer?.userId) === Number(user?.id);
}

export async function appendBookingHistory({
  booking,
  changeType,
  user,
  reason = "",
  before = null,
  after = null,
  paymentDelta = 0,
  statusBefore = "",
  statusAfter = "",
}) {
  if (!booking) return null;
  return BookingHistory.create({
    bookingId: booking.id,
    bookingGroupId: booking.bookingGroupId || "",
    changeType,
    changedBy: Number(user?.id) || null,
    source: sourceFor(user),
    reason: String(reason || "").slice(0, 500),
    fieldBefore: before,
    fieldAfter: after,
    paymentDelta: Math.round(Number(paymentDelta) || 0),
    statusBefore,
    statusAfter,
  });
}

export async function syncBookingGroup(groupId) {
  if (!groupId) return null;
  const members = await Booking.find({ bookingGroupId: groupId }).sort({ id: 1 });
  const active = members.filter((member) => member.status !== "cancelled");
  const total = active.reduce((sum, member) => sum + Number(member.total || 0), 0);
  const status = active.length === 0
    ? "cancelled"
    : active.every((member) => member.status === "completed")
      ? "completed"
      : active.some((member) => member.status === "confirmed")
        ? "confirmed"
        : "pending";
  await Booking.updateMany({ bookingGroupId: groupId }, { $set: { groupTotal: total } });
  return BookingGroup.findOneAndUpdate(
    { id: groupId },
    { $set: { total, status } },
    { new: true }
  );
}

async function buildProposal(booking, input) {
  const date = String(input.newDate || input.date || "").trim();
  const time = String(input.newTime || input.time || "").trim();
  const duration = Number(input.newDuration || input.duration);
  const fieldId = Number(input.newFieldId || input.fieldId || booking.fieldId);
  const courtId = Number(input.newCourtId || input.courtId || booking.courtId);

  if (!validDate(date) || !validTime(time) || !Number.isFinite(duration) || duration <= 0 || duration > 8) {
    const error = new Error("Ngày, giờ hoặc thời lượng mới không hợp lệ");
    error.statusCode = 400;
    throw error;
  }
  if (startMs(date, time) <= Date.now()) {
    const error = new Error("Không thể đổi sang buổi đã qua hoặc đang diễn ra");
    error.statusCode = 409;
    throw error;
  }

  const [field, court] = await Promise.all([
    Field.findOne({ id: fieldId }),
    Court.findOne({ id: courtId }),
  ]);
  if (!field || !court || court.fieldId !== fieldId) {
    const error = new Error("Sân hoặc cơ sở mới không tồn tại");
    error.statusCode = 404;
    throw error;
  }
  if (field.status !== "active" || court.status !== "active") {
    const error = new Error("Sân mới hiện không sẵn sàng để đặt");
    error.statusCode = 409;
    throw error;
  }
  const open = toMin(field.openTime || "06:00");
  const close = toMin(field.closeTime || "22:00");
  if (toMin(time) < open || toMin(time) + duration * 60 > close) {
    const error = new Error(`Khung giờ mới phải nằm trong giờ hoạt động ${field.openTime}–${field.closeTime}`);
    error.statusCode = 400;
    throw error;
  }

  let reservedCourts = [court];
  if (booking.bookingMode === "full_field") {
    reservedCourts = await Court.find({ fieldId, status: "active" }).sort({ id: 1 });
    if (reservedCourts.length < 2) {
      const error = new Error("Cơ sở mới không đủ sân con đang hoạt động để bao sân");
      error.statusCode = 409;
      throw error;
    }
  }
  const reservedCourtIds = reservedCourts.map((item) => Number(item.id));
  const requestedSlots = slotTimes(time, duration);
  const conflict = await BookingSlot.findOne({
    bookingId: { $ne: booking.id },
    courtId: { $in: reservedCourtIds },
    date,
    time: { $in: requestedSlots },
  });
  if (conflict) {
    const error = new Error("Khung giờ mới vừa được người khác đặt. Đơn cũ vẫn được giữ nguyên.");
    error.statusCode = 409;
    throw error;
  }

  const oldCourts = booking.bookingMode === "full_field"
    ? await Court.find({ id: { $in: booking.reservedCourtIds || [] } })
    : await Court.find({ id: booking.courtId });
  const oldBasePrice = oldCourts.reduce((sum, item) => sum + Number(item.price || 0), 0) * Number(booking.duration || 1);
  const allocatedExtras = Number(booking.total || 0) - oldBasePrice;
  const newBasePrice = reservedCourts.reduce((sum, item) => sum + Number(item.price || 0), 0) * duration;
  const newPrice = Math.max(0, Math.round(newBasePrice + allocatedExtras));

  return {
    fieldId,
    courtId,
    fieldName: field.name,
    court: booking.bookingMode === "full_field"
      ? `Bao toàn bộ sân (${reservedCourts.length} sân con)`
      : court.name,
    reservedCourtIds,
    date,
    time,
    duration,
    total: newPrice,
  };
}

async function replaceSlotsAndBooking(booking, proposal, adjustment, user) {
  const oldLocks = await BookingSlot.find({ bookingId: booking.id }).lean();
  const newLocks = proposal.reservedCourtIds.flatMap((courtId) =>
    slotTimes(proposal.time, proposal.duration).map((time) => ({
      bookingId: booking.id,
      courtId,
      date: proposal.date,
      time,
    }))
  );
  const before = snapshot(booking);
  const groupBefore = booking.bookingGroupId ? await BookingGroup.findOne({ id: booking.bookingGroupId }).lean() : null;
  let bookingUpdated = false;

  await BookingSlot.deleteMany({ bookingId: booking.id });
  try {
    await BookingSlot.insertMany(newLocks, { ordered: true });
    const updated = await Booking.findOneAndUpdate(
      {
        id: booking.id,
        status: { $nin: ["cancelled", "completed"] },
        date: booking.date,
        time: booking.time,
      },
      {
        $set: {
          ...proposal,
          pendingAdjustmentId: "",
          ...(adjustment?.paymentDelta < 0 && booking.paymentStatus !== "unpaid"
            ? {
              refundAmount: Math.abs(adjustment.paymentDelta),
              refundStatus: "pending",
              refundReason: "reschedule_price_difference",
            }
            : {}),
        },
      },
      { new: true, runValidators: true }
    );
    if (!updated) throw new Error("Đơn đã thay đổi trong lúc xử lý");
    bookingUpdated = true;
    await syncBookingGroup(booking.bookingGroupId);
    if (adjustment?.paymentDelta > 0) {
      await Booking.updateOne({ id: booking.id }, { $inc: { paidAmount: adjustment.paymentDelta } });
      await BookingGroup.updateOne({ id: booking.bookingGroupId }, { $inc: { paidAmount: adjustment.paymentDelta } });
    } else if (adjustment?.paymentDelta < 0 && booking.paymentStatus !== "unpaid") {
      await BookingGroup.updateOne(
        { id: booking.bookingGroupId },
        { $inc: { refundAmount: Math.abs(adjustment.paymentDelta) }, $set: { paymentStatus: "partially_refunded" } }
      );
    }
    await appendBookingHistory({
      booking: updated,
      changeType: "reschedule",
      user,
      reason: adjustment?.reason || "",
      before,
      after: snapshot(updated),
      paymentDelta: adjustment?.paymentDelta || (proposal.total - Number(booking.total || 0)),
      statusBefore: booking.status,
      statusAfter: updated.status,
    });
    return updated;
  } catch (error) {
    if (bookingUpdated) {
      await Booking.updateOne({ id: booking.id }, { $set: before });
      if (groupBefore) {
        await BookingGroup.updateOne({ id: groupBefore.id }, { $set: { total: groupBefore.total, paidAmount: groupBefore.paidAmount, paymentStatus: groupBefore.paymentStatus, refundAmount: groupBefore.refundAmount, status: groupBefore.status } });
        await Booking.updateMany({ bookingGroupId: groupBefore.id }, { $set: { groupTotal: groupBefore.total } });
      }
    }
    await BookingSlot.deleteMany({ bookingId: booking.id });
    if (oldLocks.length) {
      await BookingSlot.insertMany(oldLocks.map(({ bookingId, courtId, date, time }) => ({ bookingId, courtId, date, time })), { ordered: false });
    }
    throw error;
  }
}

export async function requestBookingReschedule({ booking, input, user }) {
  if (booking.refundStatus === "pending") {
    const error = new Error("Buổi này đang chờ hoàn tiền, vui lòng xử lý xong trước khi đổi tiếp");
    error.statusCode = 409;
    throw error;
  }
  if (["cancelled", "completed"].includes(booking.status) || startMs(booking.date, booking.time) <= Date.now()) {
    const error = new Error("Không thể sửa buổi đã qua, đang diễn ra, đã hủy hoặc đã hoàn tất");
    error.statusCode = 409;
    throw error;
  }
  const proposal = await buildProposal(booking, input);
  if (booking.pendingAdjustmentId) {
    await BookingAdjustment.updateOne({ id: booking.pendingAdjustmentId, status: "pending_payment" }, { $set: { status: "cancelled", failureReason: "superseded_by_new_request" } });
  }
  const delta = Math.round(proposal.total - Number(booking.total || 0));
  const adjustmentId = `ADJ_${booking.id}_${Date.now()}`;
  const adjustment = await BookingAdjustment.create({
    id: adjustmentId,
    bookingGroupId: booking.bookingGroupId,
    bookingId: booking.id,
    requestedBy: Number(user.id),
    reason: String(input.reason || "").slice(0, 500),
    oldValue: snapshot(booking),
    newValue: proposal,
    oldPrice: Number(booking.total || 0),
    newPrice: proposal.total,
    paymentDelta: delta,
    status: delta > 0 && booking.paymentStatus !== "unpaid" ? "pending_payment" : delta < 0 ? "refund_pending" : "applying",
  });

  if (delta > 0 && booking.paymentStatus !== "unpaid") {
    await Booking.updateOne({ id: booking.id }, { $set: { pendingAdjustmentId: adjustment.id } });
    return { status: "requires_payment", adjustment, booking };
  }

  try {
    const updated = await replaceSlotsAndBooking(booking, proposal, adjustment, user);
    adjustment.status = delta < 0 && booking.paymentStatus !== "unpaid" ? "refund_pending" : "applied";
    adjustment.appliedAt = new Date();
    await adjustment.save();
    return { status: adjustment.status, adjustment, booking: updated };
  } catch (error) {
    adjustment.status = "failed";
    adjustment.failureReason = error.message;
    await adjustment.save();
    throw error;
  }
}

export async function applyPaidAdjustment(adjustmentId) {
  const adjustment = await BookingAdjustment.findOneAndUpdate(
    { id: adjustmentId, status: "pending_payment" },
    { $set: { status: "applying", failureReason: "" } },
    { new: true }
  );
  if (!adjustment) {
    const existing = await BookingAdjustment.findOne({ id: adjustmentId });
    if (existing?.status === "applied") return { adjustment: existing, booking: await Booking.findOne({ id: existing.bookingId }) };
    throw new Error("Yêu cầu đổi lịch không còn hiệu lực");
  }

  const booking = await Booking.findOne({ id: adjustment.bookingId });
  if (!booking || booking.pendingAdjustmentId !== adjustment.id) {
    adjustment.status = "failed";
    adjustment.failureReason = "Booking changed before payment completed";
    await adjustment.save();
    throw new Error("Đơn đã thay đổi trước khi thanh toán phụ thu");
  }

  try {
    const freshProposal = await buildProposal(booking, adjustment.newValue);
    if (Number(freshProposal.total) !== Number(adjustment.newPrice)) throw new Error("Giá sân đã thay đổi, khoản phụ thu sẽ được hoàn");
    const updated = await replaceSlotsAndBooking(booking, freshProposal, adjustment, { id: adjustment.requestedBy, role: "user" });
    adjustment.status = "applied";
    adjustment.appliedAt = new Date();
    await adjustment.save();
    return { adjustment, booking: updated };
  } catch (error) {
    adjustment.status = "failed";
    adjustment.failureReason = error.message;
    await adjustment.save();
    await Booking.updateOne({ id: booking.id }, { $set: { pendingAdjustmentId: "" } });
    throw error;
  }
}
