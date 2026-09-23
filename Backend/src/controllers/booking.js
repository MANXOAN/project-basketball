import Booking from "../models/Booking";
import Court from "../models/Court";
import Field from "../models/Field";
import Payment from "../models/Payment";
import BookingSlot from "../models/BookingSlot";
import Notification from "../models/Notification";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";
import Voucher from "../models/Voucher";
import { sendMail } from "../utils/mailer";

function toMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

function overlaps(aTime, aDur, bTime, bDur) {
  const a0 = toMin(aTime);
  const a1 = a0 + (aDur || 1) * 60;
  const b0 = toMin(bTime);
  const b1 = b0 + (bDur || 1) * 60;
  return a0 < b1 && b0 < a1;
}

function slotTimes(time, duration) {
  const slots = [];
  const start = toMin(time);
  const count = Math.ceil(Number(duration) * 2);
  for (let index = 0; index < count; index += 1) {
    const minute = start + index * 30;
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return slots;
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}

function isBasketballCourt(court) {
  return String(court.type || "").toLocaleLowerCase("vi-VN").includes("bóng rổ");
}

function bookingStart(date, time) {
  return new Date(`${date}T${time}:00`);
}

function refundableAmount(booking) {
  if (Number.isFinite(Number(booking.paidAmount)) && Number(booking.paidAmount) > 0) {
    return Number(booking.paidAmount);
  }
  if (booking.paymentStatus === "deposit_paid") return Math.round(Number(booking.total) * 0.3);
  if (booking.paymentStatus === "paid") return Number(booking.total);
  return 0;
}

export async function expirePendingPayments() {
  const expired = await Booking.find({
    status: "pending",
    paymentStatus: "unpaid",
    paymentExpiresAt: { $ne: null, $lte: new Date() },
  }).select("id");
  const expiredIds = expired.map((booking) => booking.id);
  if (expiredIds.length) {
    await BookingSlot.deleteMany({ bookingId: { $in: expiredIds } });
  }
  await Booking.updateMany(
    {
      status: "pending",
      paymentStatus: "unpaid",
      paymentExpiresAt: { $ne: null, $lte: new Date() },
    },
    { $set: { status: "cancelled", cancellationReason: "payment_expired" } }
  );
}

export async function getBookings(req, res) {
  try {
    await expirePendingPayments();
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.courtId) filter.courtId = Number(req.query.courtId);
    if (req.query.fieldId) filter.fieldId = Number(req.query.fieldId);
    if (req.query.status) filter.status = req.query.status;
    const list = await Booking.find(filter).sort({ id: -1 });
    return res.json(serializeMany(list));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getBooking(req, res) {
  try {
    await expirePendingPayments();
    const id = Number(req.params.id);
    const b = await Booking.findOne({ id });
    if (!b) return res.status(404).json({ message: "Not found" });
    return res.json(serialize(b));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// Chi tiết đơn cho màn khách hàng: bổ sung thông tin cơ sở/sân thực tế,
// không tin vào fieldName/court do client từng gửi lúc tạo đơn.
export async function getBookingDetail(req, res) {
  try {
    const id = Number(req.params.id);
    const booking = await Booking.findOne({ id });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });

    const [field, court] = await Promise.all([
      Field.findOne({ id: booking.fieldId }),
      Court.findOne({ id: booking.courtId }),
    ]);
    const data = serialize(booking);
    return res.json({
      ...data,
      field: field ? {
        id: field.id,
        name: field.name,
        address: field.address,
        city: field.city,
        phone: field.phone,
        openTime: field.openTime,
        closeTime: field.closeTime,
        image: field.image,
      } : null,
      courtDetail: court ? {
        id: court.id,
        name: court.name,
        type: court.type,
        capacity: court.capacity,
      } : null,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// Danh sách nghiệp vụ dành cho admin: các đơn khách đã hủy có/đã có hoàn tiền.
export async function getRefundRequests(_req, res) {
  try {
    const list = await Booking.find({
      status: "cancelled",
      refundStatus: { $in: ["pending", "completed"] },
    }).sort({ updatedAt: -1, id: -1 });
    return res.json(serializeMany(list));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function createBooking(req, res) {
  try {
    // Release timed-out payment holds before checking availability.
    await expirePendingPayments();
    const {
      fieldId,
      courtId,
      fieldName,
      court,
      date,
      recurringDates,
      time,
      duration,
      total,
      customer,
      services,
      paymentMethod,
      voucherCode,
      discount,
    } = req.body;

    const targetDates = (recurringDates && recurringDates.length > 0) ? recurringDates : [date];
    const dur = Number(duration) || 1;
    const numericCourtId = Number(courtId);
    const numericFieldId = Number(fieldId);

    if (!Number.isFinite(dur) || dur <= 0 || dur > 8 || !validTime(time)) {
      return res.status(400).json({ message: "Khung giờ hoặc thời lượng đặt sân không hợp lệ" });
    }

    const [selectedCourt, selectedField] = await Promise.all([
      Court.findOne({ id: numericCourtId }),
      Field.findOne({ id: numericFieldId }),
    ]);
    if (!selectedCourt || selectedCourt.fieldId !== numericFieldId || !selectedField) {
      return res.status(400).json({ message: "Sân hoặc cơ sở không tồn tại" });
    }
    if (selectedCourt.status !== "active" || selectedField.status !== "active") {
      return res.status(400).json({ message: "Sân hiện không sẵn sàng để đặt" });
    }
    if (!isBasketballCourt(selectedCourt)) {
      return res.status(400).json({ message: "Chỉ hỗ trợ đặt sân bóng rổ" });
    }

    const open = toMin(selectedField.openTime || "06:00");
    const close = toMin(selectedField.closeTime || "22:00");
    const start = toMin(time);
    if (start < open || start + dur * 60 > close) {
      return res.status(400).json({ message: `Khung giờ phải nằm trong giờ hoạt động ${selectedField.openTime}–${selectedField.closeTime}` });
    }

    for (const d of targetDates) {
      if (!courtId || !d || !time) {
        return res.status(400).json({ message: "Thiếu courtId, date hoặc time" });
      }

      const existing = await Booking.find({
        courtId: numericCourtId,
        date: d,
        status: { $ne: "cancelled" },
      });

      const conflict = existing.find((b) =>
        overlaps(b.time, b.duration, time, dur)
      );
      if (conflict) {
        return res.status(409).json({
          message: `Khung giờ ngày ${d} đã được đặt. Vui lòng chọn giờ khác.`,
          conflictId: conflict.id,
        });
      }
    }

    const bookingIds = await Promise.all(targetDates.map(() => nextId("bookings")));
    const locks = targetDates.flatMap((d, index) => slotTimes(time, dur).map((slot) => ({
      bookingId: bookingIds[index], courtId: numericCourtId, date: d, time: slot,
    })));

    try {
      await BookingSlot.insertMany(locks, { ordered: true });
    } catch (error) {
      await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Khung giờ vừa được người khác đặt. Vui lòng chọn giờ khác." });
      }
      throw error;
    }

    let firstBooking = null;
    const singleTotal = Number(total) / targetDates.length || 0;

    try {
      for (const [index, d] of targetDates.entries()) {
        const booking = await Booking.create({
        id: bookingIds[index],
        fieldId: numericFieldId,
        courtId: numericCourtId,
        fieldName: selectedField.name,
        court: selectedCourt.name,
        date: d,
        time,
        duration: dur,
        total: singleTotal,
        customer: customer || {},
        services: services || [],
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "unpaid",
        paidAmount: 0,
        paymentExpiresAt: paymentMethod === "cash" ? null : new Date(Date.now() + 15 * 60 * 1000),
        status: "pending",
        voucherCode: voucherCode || "",
        discount: discount || 0,
        createdAt: new Date().toISOString(),
      });
        if (!firstBooking) firstBooking = booking;
      }
    } catch (error) {
      await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
      throw error;
    }

    // Cập nhật lượt dùng của voucher
    if (voucherCode) {
      await Voucher.findOneAndUpdate(
        { code: voucherCode },
        { $inc: { used: 1 } }
      );
    }

    return res.status(201).json(serialize(firstBooking));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function updateBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const current = await Booking.findOne({ id });
    if (!current) return res.status(404).json({ message: "Not found" });

    if (current.status === "cancelled" && req.body.status && req.body.status !== "cancelled") {
      return res.status(400).json({ message: "Đơn đã hủy không thể thay đổi trạng thái" });
    }

    const forbidden = ["status", "paymentStatus", "paidAmount", "refundAmount", "refundStatus", "checkedInAt"];
    if (forbidden.some((key) => Object.prototype.hasOwnProperty.call(req.body, key))) {
      return res.status(400).json({ message: "Trạng thái đơn và thanh toán được cập nhật tự động qua luồng nghiệp vụ" });
    }

    const b = await Booking.findOneAndUpdate(
      { id },
      { $set: req.body },
      { new: true }
    );

    return res.json(serialize(b));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function cancelBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const booking = await Booking.findOne({ id });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({ message: "Đơn này không thể hủy" });
    }
    const refundAmount = refundableAmount(booking);
    if (refundAmount > 0 && bookingStart(booking.date, booking.time).getTime() - Date.now() < 2 * 60 * 60 * 1000) {
      return res.status(400).json({ message: "Đơn đã thanh toán chỉ được hủy trước giờ bắt đầu ít nhất 2 tiếng" });
    }
    if (refundAmount > 0 && (!req.body.refundStk || !req.body.refundBank)) {
      return res.status(400).json({ message: "Cần số tài khoản và ngân hàng để hoàn tiền" });
    }
    const updated = await Booking.findOneAndUpdate(
      { id },
      { $set: {
        status: "cancelled",
        refundStk: req.body.refundStk || "",
        refundBank: req.body.refundBank || "",
        refundAmount,
        refundStatus: refundAmount > 0 ? "pending" : "none",
        cancellationReason: refundAmount > 0 ? "customer_refund" : "customer_unpaid",
      } },
      { new: true }
    );
    await BookingSlot.deleteMany({ bookingId: id });
    if (updated.customer?.email && refundAmount > 0) {
      sendMail(updated.customer.email, `Xác nhận hủy đơn BK${String(updated.id).padStart(6, "0")}`,
        `Xin chào ${updated.customer.fullName},<br/>Yêu cầu hủy đơn đã được ghi nhận. Hệ thống sẽ hoàn ${refundAmount.toLocaleString("vi-VN")} VNĐ vào ${updated.refundBank} - ${updated.refundStk}.`);
    }
    return res.json(serialize(updated));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function completeRefund(req, res) {
  try {
    const id = Number(req.params.id);
    const booking = await Booking.findOne({ id });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
    if (booking.status !== "cancelled" || booking.refundStatus !== "pending") {
      return res.status(400).json({ message: "Đơn không có yêu cầu hoàn tiền đang chờ" });
    }
    const updated = await Booking.findOneAndUpdate(
      { id }, { $set: { refundStatus: "completed", paymentStatus: "refunded" } }, { new: true }
    );
    await Payment.findOneAndUpdate(
      { paymentCode: `REFUND_${id}` },
      { bookingId: id, paymentCode: `REFUND_${id}`, paymentKind: "refund", gateway: "manual", amount: updated.refundAmount, status: "success", paidAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const notificationId = await nextId("notifications");
    await Notification.findOneAndUpdate(
      { bookingId: id, type: "refund_completed" },
      {
        $setOnInsert: {
          id: notificationId,
          userId: Number(updated.customer?.userId) || undefined,
          email: updated.customer?.email || undefined,
          bookingId: id,
          type: "refund_completed",
          title: "Hoàn tiền thành công",
          message: `Đơn BK${String(id).padStart(6, "0")} đã được hoàn ${Number(updated.refundAmount || 0).toLocaleString("vi-VN")} ₫.`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json(serialize(updated));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function checkInBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const booking = await Booking.findOne({ id });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy mã đơn" });
    if (booking.status === "cancelled") return res.status(400).json({ message: "Đơn đã hủy, không thể check-in" });
    if (booking.status === "completed") return res.status(400).json({ message: "Đơn này đã check-in" });
    if (booking.status !== "confirmed") return res.status(400).json({ message: "Đơn chưa được thanh toán/xác nhận" });
    const updated = await Booking.findOneAndUpdate(
      { id }, { $set: { status: "completed", checkedInAt: new Date() } }, { new: true }
    );
    return res.json(serialize(updated));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function deleteBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const b = await Booking.findOneAndDelete({ id });
    if (!b) return res.status(404).json({ message: "Not found" });
    await BookingSlot.deleteMany({ bookingId: id });
    return res.json(serialize(b));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
