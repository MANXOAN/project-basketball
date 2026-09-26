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
import { buildCashBookingEmail } from "../utils/bookingEmail";
import { bookingModeFor, expandBookingSchedule } from "../services/bookingPlan";
import {
  calculateVoucherDiscount,
  normalizeVoucherCode,
  validateVoucherCode,
  voucherAvailabilityMessage,
  voucherClaimFilter,
} from "../services/voucherPolicy";

function toMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

function queueCashBookingEmail(booking) {
  if (!booking.customer?.email) return;
  const email = buildCashBookingEmail(booking);
  sendMail(booking.customer.email, email.subject, email.html).catch((error) => {
    console.error("Cash booking email failed:", error.message);
  });
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
  return new Date(String(date) + "T" + String(time) + ":00");
}

function vietnamBookingStartMs(date, time) {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time).split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);
}

function pastOccurrence(occurrences, now = Date.now()) {
  return occurrences.find((occurrence) => vietnamBookingStartMs(occurrence.date, occurrence.time) <= now);
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

async function releaseVoucherUsageForGroups(groupIds) {
  if (!groupIds.length) return;
  const groups = await BookingGroup.find({
    id: { $in: groupIds },
    paymentStatus: "unpaid",
    voucherClaimed: true,
    voucherUsageReleased: false,
    voucherCode: { $ne: "" },
  }).select("id voucherCode");

  for (const group of groups) {
    const released = await BookingGroup.findOneAndUpdate(
      { id: group.id, voucherClaimed: true, voucherUsageReleased: false },
      { $set: { voucherUsageReleased: true } },
      { new: true }
    );
    if (released) {
      await Voucher.updateOne(
        { code: group.voucherCode, used: { $gt: 0 } },
        { $inc: { used: -1 } }
      );
    }
  }
}

async function refreshBookingGroupStatus(groupId) {
  if (!groupId) return;
  const members = await Booking.find({ bookingGroupId: groupId }).select("status total");
  if (!members.length) return;

  const allCancelled = members.every((member) => member.status === "cancelled");
  const hasCancelled = members.some((member) => member.status === "cancelled");
  const allCompleted = members.every((member) => member.status === "completed");
  const status = allCancelled
    ? "cancelled"
    : hasCancelled
      ? "partially_cancelled"
      : allCompleted
        ? "completed"
        : members.some((member) => member.status === "pending")
          ? "pending"
          : "confirmed";

  await BookingGroup.updateOne({ id: groupId }, { $set: { status } });
  const activeMembers = members.filter((member) => member.status !== "cancelled");
  if (activeMembers.length) {
    const activeTotal = activeMembers.reduce((sum, member) => sum + Number(member.total || 0), 0);
    await Booking.updateMany(
      { bookingGroupId: groupId, status: { $ne: "cancelled" } },
      { $set: { groupTotal: activeTotal } }
    );
  }
  if (allCancelled) await releaseVoucherUsageForGroups([groupId]);
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
    await releaseVoucherUsageForGroups(expiredGroupIds);
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

export async function getRefundRequests(_req, res) {
  try {
    const list = await Booking.find({
      refundStatus: { $in: ["pending", "completed"] },
    }).sort({ updatedAt: -1, id: -1 });
    const bookingIds = list.map((booking) => booking.id);
    const bookingGroupIds = [...new Set(list.map((booking) => booking.bookingGroupId).filter(Boolean))];
    const paymentScope = [{ bookingId: { $in: bookingIds } }];
    if (bookingGroupIds.length) paymentScope.push({ bookingGroupId: { $in: bookingGroupIds } });
    const payments = bookingIds.length
      ? await Payment.find({
        $or: paymentScope,
        paymentKind: { $ne: "refund" },
        status: { $in: ["success", "refund_pending", "refunded"] },
      }).sort({ createdAt: -1 })
      : [];

    const data = serializeMany(list).map((booking) => {
      const matchingPayments = payments.filter((payment) =>
        payment.bookingId === booking.id ||
        (booking.bookingGroupId && payment.bookingGroupId === booking.bookingGroupId)
      );
      const relevantPayments = booking.refundReason === "duplicate_or_expired_payment"
        ? matchingPayments.filter((payment) => ["refund_pending", "refunded"].includes(payment.status))
        : matchingPayments.filter((payment) => payment.status === "success");
      const refundPayments = relevantPayments.map((payment) => ({
        paymentCode: payment.paymentCode,
        bookingGroupId: payment.bookingGroupId || "",
        transactionCode: payment.transactionCode || "",
        gateway: payment.gateway,
        bankCode: payment.bankCode || "",
        amount: payment.amount,
        paymentKind: payment.paymentKind,
        paidAt: payment.paidAt,
      }));
      const primaryPayment = refundPayments[0];
      return primaryPayment ? {
        ...booking,
        refundPayments,
        refundTransactionCode: primaryPayment.transactionCode || primaryPayment.paymentCode,
        refundPaymentCode: primaryPayment.paymentCode,
        refundGateway: primaryPayment.gateway,
        refundBankCode: primaryPayment.bankCode,
      } : { ...booking, refundPayments: [] };
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
      scheduleOccurrences,
      time,
      duration,
      customer,
      services,
      paymentMethod,
      voucherCode,
      bookingMode,
    } = req.body;

    const occurrences = expandBookingSchedule({ date, recurringDates, time, scheduleSegments, scheduleOccurrences });
    const dur = Number(duration) || 1;
    const sessionDurations = occurrences.map((occurrence) => Number(occurrence.duration ?? dur));
    const numericCourtId = Number(courtId);
    const numericFieldId = Number(fieldId);
    if (!Number.isFinite(dur) || dur <= 0 || dur > 8 || sessionDurations.some((sessionDuration) => !Number.isFinite(sessionDuration) || sessionDuration <= 0 || sessionDuration > 8)) {
      return res.status(400).json({ message: "Thời lượng đặt sân không hợp lệ" });
    }
    const elapsedOccurrence = pastOccurrence(occurrences);
    if (elapsedOccurrence) {
      return res.status(400).json({
        message: "Khung giờ " + elapsedOccurrence.time + " ngày " + elapsedOccurrence.date + " đã qua, vui lòng chọn thời gian khác",
      });
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
    for (const [index, occurrence] of occurrences.entries()) {
      const start = toMin(occurrence.time);
      if (!validTime(occurrence.time) || start < open || start + sessionDurations[index] * 60 > close) {
        return res.status(400).json({
          message: `Khung giờ ngày ${occurrence.date} phải nằm trong giờ hoạt động ${selectedField.openTime}–${selectedField.closeTime}`,
        });
      }
    }

    const normalizedServices = sanitizeServices(services);
    const servicesTotal = normalizedServices.reduce((sum, service) => sum + service.price * service.quantity, 0);
    const hourlyRate = reservableCourts.reduce((sum, court) => sum + Number(court.price || 0), 0);
    const serviceShares = occurrences.map((_occurrence, index) => splitAmount(servicesTotal, occurrences.length, index));
    const sessionGrossTotals = occurrences.map((_occurrence, index) =>
      Math.round(hourlyRate * sessionDurations[index] + serviceShares[index])
    );
    const grossTotal = sessionGrossTotals.reduce((sum, sessionTotal) => sum + sessionTotal, 0);
    const normalizedVoucherCode = normalizeVoucherCode(voucherCode);
    let voucher = null;
    let calculatedDiscount = 0;
    if (normalizedVoucherCode) {
      if (!validateVoucherCode(normalizedVoucherCode)) {
        return res.status(400).json({ message: "Mã khuyến mãi không hợp lệ" });
      }
      voucher = await Voucher.findOne({ code: normalizedVoucherCode });
      const unavailableMessage = voucherAvailabilityMessage(voucher);
      if (unavailableMessage) return res.status(400).json({ message: unavailableMessage });
      calculatedDiscount = calculateVoucherDiscount(voucher, grossTotal);
    }
    const calculatedTotal = Math.max(0, grossTotal - calculatedDiscount);
    const sessionDiscounts = allocateAmountByWeights(calculatedDiscount, sessionGrossTotals);
    const sessionTotals = sessionGrossTotals.map((sessionTotal, index) => sessionTotal - sessionDiscounts[index]);

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
        slotTimes(occurrence.time, sessionDurations[index]).map((slot) => ({
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
    const isComplimentaryBooking = calculatedTotal === 0;
    const paymentExpiresAt = normalizedPaymentMethod === "cash" || isComplimentaryBooking ? null : new Date(Date.now() + 15 * 60 * 1000);
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
          duration: sessionDurations[index],
          total: sessionTotals[index],
          customer: bookingCustomer,
          services: normalizedServices,
          paymentMethod: normalizedPaymentMethod,
          paymentStatus: isComplimentaryBooking ? "paid" : "unpaid",
          paidAmount: 0,
          paymentExpiresAt,
          status: isComplimentaryBooking ? "confirmed" : "pending",
          voucherCode: normalizedVoucherCode,
          discount: sessionDiscounts[index],
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
        paymentStatus: isComplimentaryBooking ? "paid" : "unpaid",
        status: isComplimentaryBooking ? "confirmed" : "pending",
        paymentExpiresAt,
        userId: bookingCustomer.userId || null,
        voucherCode: normalizedVoucherCode,
        voucherClaimed: false,
        voucherUsageReleased: false,
      });
    } catch (error) {
      await BookingGroup.deleteOne({ id: bookingGroupId });
      await Booking.deleteMany({ id: { $in: createdBookingIds } });
      await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
      throw error;
    }

    if (voucher) {
      const claimedVoucher = await Voucher.findOneAndUpdate(
        voucherClaimFilter(voucher),
        { $inc: { used: 1 } },
        { new: true }
      );
      if (!claimedVoucher) {
        await BookingGroup.deleteOne({ id: bookingGroupId });
        await Booking.deleteMany({ id: { $in: createdBookingIds } });
        await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
        return res.status(409).json({ message: "Voucher vừa hết lượt hoặc không còn hiệu lực" });
      }
      const markedGroup = await BookingGroup.updateOne(
        { id: bookingGroupId, voucherClaimed: false },
        { $set: { voucherClaimed: true } }
      );
      if (markedGroup.modifiedCount !== 1) {
        await Voucher.updateOne({ id: voucher.id, used: { $gt: 0 } }, {$inc: { used: -1 } });
        await BookingGroup.deleteOne({ id: bookingGroupId });
        await Booking.deleteMany({ id: { $in: createdBookingIds } });
        await BookingSlot.deleteMany({ bookingId: { $in: bookingIds } });
        return res.status(409).json({ message: "Không thể ghi nhận lượt sử dụng voucher" });
      }
    }

    if (normalizedPaymentMethod === "cash" && calculatedTotal > 0) {
      queueCashBookingEmail({
        ...serialize(firstBooking),
        groupTotal: calculatedTotal,
        groupSize: occurrences.length,
        schedule: occurrences.map((occurrence, index) => ({
          id: bookingIds[index],
          fieldName: selectedField.name,
          court: courtLabel,
          date: occurrence.date,
          time: occurrence.time,
          duration: sessionDurations[index],
          total: sessionTotals[index],
        })),
      });
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

export async function extendBooking(req, res) {
  try {
    await expirePendingPayments();
    const id = Number(req.params.id);
    const booking = await Booking.findOne({ id });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ message: "Bạn không có quyền gia hạn đơn này" });
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ message: "Chỉ có thể gia hạn đơn chưa hủy hoặc hoàn thành" });
    }
    if (Number(booking.groupSize || 1) > 1) {
      return res.status(400).json({ message: "Không thể gia hạn lịch đặt nhiều buổi" });
    }

    const duration = Number(booking.duration || 1);
    if (!Number.isFinite(duration) || duration <= 0 || duration >= 8) {
      return res.status(400).json({ message: "Thời lượng đặt sân đã đạt giới hạn gia hạn" });
    }
    const extensionTimeMinutes = toMin(booking.time) + duration * 60;
    const extensionTime = `${String(Math.floor(extensionTimeMinutes / 60)).padStart(2, "0")}:${String(extensionTimeMinutes % 60).padStart(2, "0")}`;
    if (!validTime(extensionTime) || vietnamBookingStartMs(booking.date, extensionTime) <= Date.now()) {
      return res.status(400).json({ message: "Khung giờ thuê thêm đã qua hoặc không hợp lệ" });
    }

    const field = await Field.findOne({ id: booking.fieldId });
    const reservedCourtIds = booking.reservedCourtIds?.length
      ? [...new Set(booking.reservedCourtIds.map(Number))]
      : [Number(booking.courtId)];
    const courts = await Court.find({
      id: { $in: reservedCourtIds },
      fieldId: booking.fieldId,
      status: "active",
    });
    if (!field || field.status !== "active" || courts.length !== reservedCourtIds.length || courts.some((court) => !isBasketballCourt(court))) {
      return res.status(400).json({ message: "Sân hoặc cơ sở hiện không sẵn sàng để gia hạn" });
    }
    const close = toMin(field.closeTime || "22:00");
    if (extensionTimeMinutes + 60 > close) {
      return res.status(400).json({ message: `Khung giờ phải nằm trong giờ hoạt động ${field.openTime}–${field.closeTime}` });
    }

    const extensionSlots = slotTimes(extensionTime, 1);
    const insertedLockIds = [];
    try {
      for (const courtId of reservedCourtIds) {
        for (const time of extensionSlots) {
          const lock = await BookingSlot.create({ bookingId: id, courtId, date: booking.date, time });
          insertedLockIds.push(lock._id);
        }
      }
    } catch (error) {
      if (insertedLockIds.length) await BookingSlot.deleteMany({ _id: { $in: insertedLockIds } });
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Khung giờ thuê thêm vừa được người khác đặt" });
      }
      throw error;
    }

    const extensionPrice = courts.reduce((sum, court) => sum + Number(court.price || 0), 0);
    const nextTotal = Number(booking.total || 0) + extensionPrice;
    const paidAmount = Number(booking.paidAmount) > 0
      ? Number(booking.paidAmount)
      : booking.paymentStatus === "paid"
        ? Number(booking.total || 0)
        : booking.paymentStatus === "deposit_paid"
          ? Math.round(Number(booking.total || 0) * 0.3)
          : 0;
    const paymentStatus = paidAmount >= nextTotal ? "paid" : paidAmount > 0 ? "deposit_paid" : "unpaid";
    const updated = await Booking.findOneAndUpdate(
      { id, duration: booking.duration, total: booking.total, status: booking.status },
      {
        $set: {
          duration: duration + 1,
          extensionHours: Number(booking.extensionHours || 0) + 1,
          total: nextTotal,
          groupTotal: Number(booking.groupTotal || booking.total || 0) + extensionPrice,
          paidAmount,
          paymentStatus,
        },
      },
      { new: true }
    );
    if (!updated) {
      await BookingSlot.deleteMany({ _id: { $in: insertedLockIds } });
      return res.status(409).json({ message: "Đơn vừa thay đổi. Vui lòng tải lại và thử lại." });
    }

    if (booking.bookingGroupId) {
      await BookingGroup.updateOne(
        { id: booking.bookingGroupId },
        {
          $inc: { total: extensionPrice },
          $set: { paidAmount, paymentStatus },
        }
      );
    }
    return res.json(serialize(updated));
  } catch (error) {
    return res.status(400).json({ message: error.message });
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

export async function rescheduleBooking(req, res) {
  try {
    await expirePendingPayments();
    const id = Number(req.params.id);
    const booking = await Booking.findOne({ id });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
    if (!canAccessBooking(req.user, booking)) {
      return res.status(403).json({ message: "Bạn không có quyền đổi lịch đơn này" });
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ message: "Chỉ có thể đổi lịch cho buổi chưa hủy hoặc hoàn thành" });
    }

    const date = String(req.body.date || "");
    const time = String(req.body.time || "");
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date ||
        !validTime(time) || Number(time.slice(-2)) % 30 !== 0) {
      return res.status(400).json({ message: "Ngày hoặc giờ mới không hợp lệ" });
    }
    if (pastOccurrence([{ date, time }])) {
      return res.status(400).json({ message: "Khung giờ mới đã qua, vui lòng chọn thời gian khác" });
    }
    if (date === booking.date && time === booking.time) return res.json(serialize(booking));

    const field = await Field.findOne({ id: booking.fieldId });
    const reservedCourtIds = booking.reservedCourtIds?.length
      ? [...new Set(booking.reservedCourtIds.map(Number))]
      : [Number(booking.courtId)];
    const courts = await Court.find({
      id: { $in: reservedCourtIds },
      fieldId: booking.fieldId,
      status: "active",
    });
    if (!field || field.status !== "active" || courts.length !== reservedCourtIds.length || courts.some((court) => !isBasketballCourt(court))) {
      return res.status(400).json({ message: "Sân hoặc cơ sở hiện không sẵn sàng để đổi lịch" });
    }
    const start = toMin(time);
    const close = toMin(field.closeTime || "22:00");
    if (start < toMin(field.openTime || "06:00") || start + Number(booking.duration || 1) * 60 > close) {
      return res.status(400).json({ message: `Khung giờ phải nằm trong giờ hoạt động ${field.openTime}–${field.closeTime}` });
    }

    const targetLocks = reservedCourtIds.flatMap((courtId) =>
      slotTimes(time, booking.duration || 1).map((slot) => ({ courtId, date, time: slot }))
    );
    const lockKey = (lock) => `${lock.courtId}|${lock.date}|${lock.time}`;
    const existingLocks = await BookingSlot.find({ bookingId: id });
    const targetKeys = new Set(targetLocks.map(lockKey));
    const existingKeys = new Set(existingLocks.map(lockKey));
    const missingLocks = targetLocks.filter((lock) => !existingKeys.has(lockKey(lock)));
    const insertedIds = [];

    try {
      for (const lock of missingLocks) {
        const created = await BookingSlot.create({ bookingId: id, ...lock });
        insertedIds.push(created._id);
      }
    } catch (error) {
      if (insertedIds.length) await BookingSlot.deleteMany({ _id: { $in: insertedIds } });
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Một hoặc nhiều khung giờ mới vừa được người khác đặt" });
      }
      throw error;
    }

    const updated = await Booking.findOneAndUpdate(
      { id, date: booking.date, time: booking.time, status: booking.status },
      { $set: { date, time } },
      { new: true }
    );
    if (!updated) {
      if (insertedIds.length) await BookingSlot.deleteMany({ _id: { $in: insertedIds } });
      return res.status(409).json({ message: "Booking vừa thay đổi. Vui lòng tải lại và thử lại." });
    }

    const obsoleteIds = existingLocks
      .filter((lock) => !targetKeys.has(lockKey(lock)))
      .map((lock) => lock._id);
    if (obsoleteIds.length) await BookingSlot.deleteMany({ _id: { $in: obsoleteIds } });
    return res.json(serialize(updated));
  } catch (error) {
    return res.status(400).json({ message: error.message });
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
    await refreshBookingGroupStatus(updated.bookingGroupId);

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