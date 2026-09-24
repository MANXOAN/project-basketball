import Booking from "../models/Booking";
import Court from "../models/Court";
import Field from "../models/Field";
import Payment from "../models/Payment";
import BookingGroup from "../models/BookingGroup";
import BookingSlot from "../models/BookingSlot";
import Notification from "../models/Notification";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";
import Voucher from "../models/Voucher";
import { sendMail } from "../utils/mailer";
import { bookingModeFor, expandBookingSchedule } from "../services/bookingPlan";

function toMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
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

const EARLY_CANCELLATION_MS = 2 * 60 * 60 * 1000;
const STAFF_CANCELLATION_REASONS = new Set(["owner_cancelled", "maintenance"]);

function cancellationPolicy(booking, user, requestedReason, now = Date.now()) {
  const paidAmount = refundableAmount(booking);
  const staffReason = isStaff(user) && STAFF_CANCELLATION_REASONS.has(requestedReason)
    ? requestedReason
    : null;
  if (staffReason) {
    return { refundAmount: paidAmount, refundRate: paidAmount > 0 ? 100 : 0, reason: staffReason, staffCancellation: true };
  }

  const timeUntilStart = bookingStart(booking.date, booking.time).getTime() - now;
  if (paidAmount <= 0) {
    return { refundAmount: 0, refundRate: 0, reason: "customer_unpaid", staffCancellation: false };
  }
  if (timeUntilStart >= EARLY_CANCELLATION_MS) {
    return { refundAmount: paidAmount, refundRate: 100, reason: "customer_early_100", staffCancellation: false };
  }
  if (timeUntilStart > 0) {
    return { refundAmount: Math.round(paidAmount * 0.5), refundRate: 50, reason: "customer_late_50", staffCancellation: false };
  }
  return { refundAmount: 0, refundRate: 0, reason: "customer_no_refund", staffCancellation: false };
}

const SERVICE_PRICES = new Map([
  ["Bóng rổ", 20000],
  ["Áo pitch", 10000],
  ["Nước lọc", 10000],
  ["Nước muối khoáng", 15000],
]);

function isStaff(user) {
  return user?.role === "admin" || user?.role === "manager";
}

function canAccessBooking(user, booking) {
  return isStaff(user) || Number(booking.customer?.userId) === Number(user?.id);
}

function sanitizeServices(services) {
  if (!Array.isArray(services)) return [];
  return services.flatMap((service) => {
    const name = String(service?.name || "").trim();
    const price = SERVICE_PRICES.get(name);
    const quantity = Math.min(100, Math.max(0, Math.floor(Number(service?.quantity) || 0)));
    return price && quantity ? [{ name, quantity, price }] : [];
  });
}

function splitAmount(amount, count, index) {
  const whole = Math.max(0, Math.round(Number(amount) || 0));
  const base = Math.floor(whole / count);
  return base + (index < whole % count ? 1 : 0);
}

export async function expirePendingPayments() {
  const expired = await Booking.find({
    status: "pending",
    paymentStatus: "unpaid",
    paymentExpiresAt: { $ne: null, $lte: new Date() },
  }).select("id bookingGroupId");
  const expiredIds = expired.map((booking) => booking.id);
  const expiredGroupIds = [...new Set(expired.map((booking) => booking.bookingGroupId).filter(Boolean))];
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
  if (expiredGroupIds.length) {
    await BookingGroup.updateMany(
      { id: { $in: expiredGroupIds }, paymentStatus: "unpaid" },
      { $set: { status: "cancelled" } }
    );
  }
}

export async function getBookings(req, res) {
  try {
    await expirePendingPayments();
    const filter = {};
    if (!isStaff(req.user)) {
      filter["customer.userId"] = Number(req.user.id);
    }
    if (req.query.date) filter.date = req.query.date;
    if (req.query.courtId) {
      const requestedCourtId = Number(req.query.courtId);
      filter.$or = [{ courtId: requestedCourtId }, { reservedCourtIds: requestedCourtId }];
    }
    if (req.query.fieldId) filter.fieldId = Number(req.query.fieldId);
    if (req.query.status) filter.status = req.query.status;
    const list = await Booking.find(filter).sort({ id: -1 });
    return res.json(serializeMany(list));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getBookingAvailability(req, res) {
  try {
    await expirePendingPayments();
    const filter = { status: { $ne: "cancelled" } };
    if (req.query.date) filter.date = String(req.query.date);
    if (req.query.courtId) {
      const requestedCourtId = Number(req.query.courtId);
      filter.$or = [{ courtId: requestedCourtId }, { reservedCourtIds: requestedCourtId }];
    }
    if (!filter.date) return res.status(400).json({ message: "Thiếu ngày cần kiểm tra" });
    const list = await Booking.find(filter)
      .select("id courtId reservedCourtIds bookingMode date time duration status")
      .sort({ time: 1 });
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
    if (!canAccessBooking(req.user, b)) {
      return res.status(403).json({ message: "Bạn không có quyền xem đơn này" });
    }
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
    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ message: "Bạn không có quyền xem đơn này" });
    }
    const reservedCourtIds = booking.reservedCourtIds?.length
      ? booking.reservedCourtIds
      : [booking.courtId];
    const [field, court, reservedCourts, groupBookings] = await Promise.all([
      Field.findOne({ id: booking.fieldId }),
      Court.findOne({ id: booking.courtId }),
      Court.find({ id: { $in: reservedCourtIds } }).sort({ id: 1 }),
      booking.bookingGroupId
        ? Booking.find({ bookingGroupId: booking.bookingGroupId }).sort({ date: 1, time: 1, id: 1 })
        : Promise.resolve([booking]),
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
      reservedCourts: reservedCourts.map((reservedCourt) => ({
        id: reservedCourt.id,
        name: reservedCourt.name,
        type: reservedCourt.type,
        capacity: reservedCourt.capacity,
        price: reservedCourt.price,
      })),
      groupSchedule: groupBookings.map((groupBooking) => ({
        id: groupBooking.id,
        date: groupBooking.date,
        time: groupBooking.time,
        duration: groupBooking.duration,
        total: groupBooking.total,
        status: groupBooking.status,
        paymentStatus: groupBooking.paymentStatus,
      })),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// Danh sách nghiệp vụ dành cho admin: các đơn khách đã hủy có/đã có hoàn tiền.
export async function getRefundRequests(_req, res) {
  try {
    const list = await Booking.find({
      refundStatus: { $in: ["pending", "completed"] },
    }).sort({ updatedAt: -1, id: -1 });
    const duplicatePayments = await Payment.find({
      bookingId: { $in: list.map((booking) => booking.id) },
      status: { $in: ["refund_pending", "refunded"] },
    }).sort({ createdAt: -1 });
    const paymentByBooking = new Map();
    duplicatePayments.forEach((payment) => {
      if (!paymentByBooking.has(payment.bookingId)) paymentByBooking.set(payment.bookingId, payment);
    });
    const data = serializeMany(list).map((booking) => {
      const payment = paymentByBooking.get(booking.id);
      return payment ? { ...booking, refundTransactionCode: payment.transactionCode || payment.paymentCode, refundGateway: payment.gateway } : booking;
    });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function createBooking(req, res) {
  try {
    await expirePendingPayments();
    const {
      fieldId,
      courtId,
      date,
      recurringDates,
      scheduleSegments,
      time,
      duration,
      customer,
      services,
      paymentMethod,
      voucherCode,
      bookingMode,
    } = req.body;

    const occurrences = expandBookingSchedule({ date, recurringDates, time, scheduleSegments });
    const dur = Number(duration) || 1;
    const numericCourtId = Number(courtId);
    const numericFieldId = Number(fieldId);
    if (!Number.isFinite(dur) || dur <= 0 || dur > 8) {
      return res.status(400).json({ message: "Thời lượng đặt sân không hợp lệ" });
    }
    if (occurrences.some((occurrence) => occurrence.date < new Date().toISOString().slice(0, 10))) {
      return res.status(400).json({ message: "Không thể đặt lịch trong quá khứ" });
    }

    const [selectedCourt, selectedField, activeFieldCourts] = await Promise.all([
      Court.findOne({ id: numericCourtId }),
      Field.findOne({ id: numericFieldId }),
      Court.find({ fieldId: numericFieldId, status: "active" }).sort({ id: 1 }),
    ]);
    if (!selectedCourt || selectedCourt.fieldId !== numericFieldId || !selectedField) {
      return res.status(400).json({ message: "Sân hoặc cơ sở không tồn tại" });
    }
    if (selectedCourt.status !== "active" || selectedField.status !== "active" || !isBasketballCourt(selectedCourt)) {
      return res.status(400).json({ message: "Sân hiện không sẵn sàng để đặt" });
    }

    const normalizedMode = bookingModeFor(bookingMode, occurrences.length);
    const reservableCourts = normalizedMode === "full_field"
      ? activeFieldCourts.filter(isBasketballCourt)
      : [selectedCourt];
    if (normalizedMode === "full_field" && reservableCourts.length < 2) {
      return res.status(400).json({ message: "Cơ sở cần ít nhất 2 sân con đang hoạt động để bao sân" });
    }

    const open = toMin(selectedField.openTime || "06:00");
    const close = toMin(selectedField.closeTime || "22:00");
    for (const occurrence of occurrences) {
      const start = toMin(occurrence.time);
      if (!validTime(occurrence.time) || start < open || start + dur * 60 > close) {
        return res.status(400).json({
          message: `Khung giờ ngày ${occurrence.date} phải nằm trong giờ hoạt động ${selectedField.openTime}–${selectedField.closeTime}`,
        });
      }
    }

    const normalizedServices = sanitizeServices(services);
    const servicesTotal = normalizedServices.reduce((sum, service) => sum + service.price * service.quantity, 0);
    const hourlyRate = reservableCourts.reduce((sum, court) => sum + Number(court.price || 0), 0);
    const grossTotal = Math.round(hourlyRate * dur * occurrences.length + servicesTotal);
    const normalizedVoucherCode = String(voucherCode || "").trim();
    let voucher = null;
    let calculatedDiscount = 0;
    if (normalizedVoucherCode) {
      voucher = await Voucher.findOne({ code: normalizedVoucherCode, status: "active" });
      if (!voucher || Number(voucher.used) >= Number(voucher.limit)) {
        return res.status(400).json({ message: "Voucher không hợp lệ hoặc đã hết lượt sử dụng" });
      }
      calculatedDiscount = voucher.type === "percent"
        ? Math.round(grossTotal * Math.min(100, Math.max(0, Number(voucher.discount))) / 100)
        : Math.max(0, Number(voucher.discount));
      calculatedDiscount = Math.min(grossTotal, Math.round(calculatedDiscount));
    }
    const calculatedTotal = Math.max(0, grossTotal - calculatedDiscount);

    const suppliedCustomer = customer && typeof customer === "object" ? customer : {};
    const requesterIsStaff = isStaff(req.user);
    const bookingCustomer = {
      fullName: String(suppliedCustomer.fullName || req.user.fullName || "").trim().slice(0, 120),
      phone: String(suppliedCustomer.phone || "").trim().slice(0, 30),
      note: String(suppliedCustomer.note || "").trim().slice(0, 1000),
      userId: requesterIsStaff ? (Number(suppliedCustomer.userId) || undefined) : Number(req.user.id),
      email: requesterIsStaff
        ? (String(suppliedCustomer.email || "").trim().toLowerCase() || undefined)
        : String(req.user.email || "").trim().toLowerCase(),
    };
    if (requesterIsStaff && bookingCustomer.email === String(req.user.email || "").toLowerCase()) {
      bookingCustomer.userId = Number(req.user.id);
    }
    if (!bookingCustomer.fullName || bookingCustomer.phone.length < 9) {
      return res.status(400).json({ message: "Tên và số điện thoại khách hàng không hợp lệ" });
    }

    const normalizedPaymentMethod = String(paymentMethod || "");
    if (!["cash", "deposit", "full"].includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    const bookingIds = await Promise.all(occurrences.map(() => nextId("bookings")));
    const bookingGroupId = `BG_${bookingIds[0]}_${Date.now()}`;
    const reservedCourtIds = reservableCourts.map((court) => Number(court.id));
    const locks = occurrences.flatMap((occurrence, index) =>
      reservedCourtIds.flatMap((reservedCourtId) =>
        slotTimes(occurrence.time, dur).map((slot) => ({
          bookingId: bookingIds[index],
          courtId: reservedCourtId,
          date: occurrence.date,
          time: slot,
        }))
      )
    );

    try {
      await BookingSlot.insertMany(locks, { ordered: true });
    } catch (error) {
      await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Một hoặc nhiều khung giờ vừa được người khác đặt. Vui lòng kiểm tra lại lịch." });
      }
      throw error;
    }

    const createdBookingIds = [];
    let firstBooking = null;
    const paymentExpiresAt = normalizedPaymentMethod === "cash" ? null : new Date(Date.now() + 15 * 60 * 1000);
    const courtLabel = normalizedMode === "full_field"
      ? `Bao toàn bộ sân (${reservableCourts.length} sân con)`
      : selectedCourt.name;

    try {
      for (const [index, occurrence] of occurrences.entries()) {
        const booking = await Booking.create({
          id: bookingIds[index],
          bookingGroupId,
          bookingMode: normalizedMode,
          reservedCourtIds,
          groupTotal: calculatedTotal,
          groupSize: occurrences.length,
          isGroupPrimary: index === 0,
          fieldId: numericFieldId,
          courtId: numericCourtId,
          fieldName: selectedField.name,
          court: courtLabel,
          date: occurrence.date,
          time: occurrence.time,
          duration: dur,
          total: splitAmount(calculatedTotal, occurrences.length, index),
          customer: bookingCustomer,
          services: normalizedServices,
          paymentMethod: normalizedPaymentMethod,
          paymentStatus: "unpaid",
          paidAmount: 0,
          paymentExpiresAt,
          status: "pending",
          voucherCode: normalizedVoucherCode,
          discount: splitAmount(calculatedDiscount, occurrences.length, index),
          createdBy: Number(req.user.id),
          createdAt: new Date().toISOString(),
        });
        createdBookingIds.push(booking.id);
        if (!firstBooking) firstBooking = booking;
      }
      await BookingGroup.create({
        id: bookingGroupId,
        primaryBookingId: bookingIds[0],
        bookingIds,
        mode: normalizedMode,
        total: calculatedTotal,
        paidAmount: 0,
        paymentStatus: "unpaid",
        status: "pending",
        paymentExpiresAt,
        userId: bookingCustomer.userId || null,
      });
    } catch (error) {
      await BookingGroup.deleteOne({ id: bookingGroupId });
      await Booking.deleteMany({ id: { $in: createdBookingIds } });
      await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
      throw error;
    }

    if (voucher) {
      const claimedVoucher = await Voucher.findOneAndUpdate(
        { id: voucher.id, status: "active", used: { $lt: voucher.limit } },
        { $inc: { used: 1 } }
      );
      if (!claimedVoucher) {
        await BookingGroup.deleteOne({ id: bookingGroupId });
        await Booking.deleteMany({ id: { $in: createdBookingIds } });
        await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
        return res.status(409).json({ message: "Voucher vừa hết lượt sử dụng" });
      }
    }

    return res.status(201).json({
      ...serialize(firstBooking),
      bookingIds,
      bookingGroupId,
      groupTotal: calculatedTotal,
      groupSize: occurrences.length,
      reservedCourtIds,
      schedule: occurrences,
    });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function updateBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const current = await Booking.findOne({ id });
    if (!current) return res.status(404).json({ message: "Not found" });

    if (current.status === "cancelled") {
      return res.status(400).json({ message: "Đơn đã hủy không thể chỉnh sửa" });
    }

    const requestedCustomer = req.body.customer;
    if (!requestedCustomer || typeof requestedCustomer !== "object") {
      return res.status(400).json({ message: "Chỉ cho phép cập nhật thông tin liên hệ của khách hàng" });
    }
    const updates = {
      "customer.fullName": String(requestedCustomer.fullName ?? current.customer?.fullName ?? "").trim().slice(0, 120),
      "customer.phone": String(requestedCustomer.phone ?? current.customer?.phone ?? "").trim().slice(0, 30),
      "customer.note": String(requestedCustomer.note ?? current.customer?.note ?? "").trim().slice(0, 1000),
    };

    const b = await Booking.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
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
    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ message: "Bạn không có quyền hủy đơn này" });
    }
    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({ message: "Đơn này không thể hủy" });
    }

    const policy = cancellationPolicy(booking, req.user, String(req.body.cancellationType || ""));
    if (policy.refundAmount > 0 && !policy.staffCancellation && (!req.body.refundStk || !req.body.refundBank)) {
      return res.status(400).json({ message: "Cần số tài khoản và ngân hàng để hoàn tiền" });
    }

    if (refundableAmount(booking) === 0 && booking.bookingGroupId) {
      const groupBookings = await Booking.find({
        bookingGroupId: booking.bookingGroupId,
        status: "pending",
        paymentStatus: "unpaid",
      }).select("id");
      const groupBookingIds = groupBookings.map((item) => item.id);
      if (groupBookingIds.length) {
        await Booking.updateMany(
          { id: { $in: groupBookingIds } },
          { $set: {
            status: "cancelled",
            cancellationReason: policy.reason,
            refundReason: policy.reason,
            refundRate: 0,
            cancelledByRole: req.user?.role || "user",
          } }
        );
        await BookingSlot.deleteMany({ bookingId: { $in: groupBookingIds } });
        await BookingGroup.updateOne(
          { id: booking.bookingGroupId, paymentStatus: "unpaid" },
          { $set: { status: "cancelled" } }
        );
        const updatedGroupBooking = await Booking.findOne({ id });
        return res.json({ ...serialize(updatedGroupBooking), cancelledGroupSize: groupBookingIds.length });
      }
    }

    const updated = await Booking.findOneAndUpdate(
      { id },
      { $set: {
        status: "cancelled",
        refundStk: policy.staffCancellation ? "" : req.body.refundStk || "",
        refundBank: policy.staffCancellation ? "" : req.body.refundBank || "",
        refundAmount: policy.refundAmount,
        refundRate: policy.refundRate,
        refundStatus: policy.refundAmount > 0 ? "pending" : "none",
        refundReason: policy.reason,
        cancellationReason: policy.reason,
        cancelledByRole: req.user?.role || "user",
      } },
      { new: true }
    );
    await BookingSlot.deleteMany({ bookingId: id });

    if (updated.customer?.email && policy.refundAmount > 0) {
      const destination = policy.staffCancellation
        ? "phương thức thanh toán ban đầu"
        : (updated.refundBank + " - " + updated.refundStk);
      sendMail(
        updated.customer.email,
        `Xác nhận hủy đơn BK${String(updated.id).padStart(6, "0")}`,
        `Xin chào ${updated.customer.fullName},<br/>Đơn đã được hủy với mức hoàn ${policy.refundRate}%. Hệ thống sẽ hoàn ${policy.refundAmount.toLocaleString("vi-VN")} VNĐ về ${destination}.`
      );
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
    const isDuplicatePaymentRefund = booking.refundReason === "duplicate_or_expired_payment";
    if (booking.refundStatus !== "pending" ||
        (booking.status !== "cancelled" && !isDuplicatePaymentRefund)) {
      return res.status(400).json({ message: "Đơn không có yêu cầu hoàn tiền đang chờ" });
    }
    const completedPaymentStatus = Number(booking.refundAmount) > 0 && Number(booking.refundAmount) < refundableAmount(booking)
      ? "partially_refunded"
      : "refunded";
    const updated = await Booking.findOneAndUpdate(
      { id },
      { $set: {
        refundStatus: "completed",
        ...(booking.status === "cancelled" ? { paymentStatus: completedPaymentStatus } : {}),
      } },
      { new: true }
    );
    await Payment.findOneAndUpdate(
      { paymentCode: `REFUND_${id}` },
      { bookingId: id, paymentCode: `REFUND_${id}`, paymentKind: "refund", gateway: "manual", amount: updated.refundAmount, status: "success", paidAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (isDuplicatePaymentRefund) {
      await Payment.updateMany(
        { bookingId: id, status: "refund_pending" },
        { $set: { status: "refunded" } }
      );
    }
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
