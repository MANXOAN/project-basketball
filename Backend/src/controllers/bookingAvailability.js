import BookingSlot from "../models/BookingSlot";
import Court from "../models/Court";
import Field from "../models/Field";
import { expirePendingPayments } from "./booking";

function toMinutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}

function slotTimes(time, duration) {
  const start = toMinutes(time);
  return Array.from({ length: Math.ceil(Number(duration) * 2) }, (_, index) => {
    const minute = start + index * 30;
    return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  });
}

function vietnamStartMs(date, time) {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time).split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);
}

function isBasketballCourt(court) {
  return String(court.type || "").toLocaleLowerCase("vi-VN").includes("bóng rổ");
}

export async function checkBookingAvailability(req, res) {
  try {
    await expirePendingPayments();
    const courtId = Number(req.body.courtId);
    const duration = Number(req.body.duration);
    const occurrences = Array.isArray(req.body.occurrences) ? req.body.occurrences : [];
    if (!Number.isFinite(courtId) || !Number.isFinite(duration) || duration <= 0 || duration > 8 || !occurrences.length || occurrences.length > 60) {
      return res.status(400).json({ message: "Danh sách lịch cần kiểm tra không hợp lệ" });
    }

    const court = await Court.findOne({ id: courtId, status: "active" });
    if (!court) return res.status(400).json({ message: "Sân không tồn tại hoặc đang ngừng hoạt động" });
    const field = await Field.findOne({ id: court.fieldId, status: "active" });
    if (!field) return res.status(400).json({ message: "Cơ sở đang ngừng hoạt động" });
    const targetCourtIds = req.body.bookingMode === "full_field"
      ? (await Court.find({ fieldId: court.fieldId, status: "active" })).filter(isBasketballCourt).map((item) => item.id)
      : [courtId];
    if (req.body.bookingMode === "full_field" && targetCourtIds.length < 2) {
      return res.status(400).json({ message: "Cơ sở cần ít nhất 2 sân con đang hoạt động để bao sân" });
    }
    const normalized = occurrences.map((item) => ({ date: String(item?.date || ""), time: String(item?.time || ""), duration: item?.duration == null ? duration : Number(item.duration) }));
    if (normalized.some((item) => !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !validTime(item.time) || !Number.isFinite(item.duration) || item.duration <= 0 || item.duration > 8)) {
      return res.status(400).json({ message: "Ngày hoặc giờ cần kiểm tra không hợp lệ" });
    }

    const dates = [...new Set(normalized.map((item) => item.date))];
    const locks = await BookingSlot.find({ courtId: { $in: targetCourtIds }, date: { $in: dates } }).lean();
    const occupied = new Set(locks.map((lock) => `${lock.courtId}|${lock.date}|${lock.time}`));
    const open = toMinutes(field.openTime || "06:00");
    const close = toMinutes(field.closeTime || "22:00");
    const conflicts = [];

    normalized.forEach((occurrence) => {
      const desiredSlots = slotTimes(occurrence.time, occurrence.duration);
      const outsideOpeningHours = toMinutes(occurrence.time) < open || toMinutes(occurrence.time) + occurrence.duration * 60 > close;
      const busy = outsideOpeningHours || targetCourtIds.some((targetCourtId) => desiredSlots.some((slot) => occupied.has(`${targetCourtId}|${occurrence.date}|${slot}`)));
      if (!busy) return;
      const suggestions = [];
      for (let minute = open; minute + occurrence.duration * 60 <= close; minute += 30) {
        const candidate = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
        if (vietnamStartMs(occurrence.date, candidate) <= Date.now()) continue;
        const candidateSlots = slotTimes(candidate, occurrence.duration);
        const candidateBusy = targetCourtIds.some((targetCourtId) => candidateSlots.some((slot) => occupied.has(`${targetCourtId}|${occurrence.date}|${slot}`)));
        if (!candidateBusy) suggestions.push(candidate);
        if (suggestions.length === 6) break;
      }
      conflicts.push({ ...occurrence, suggestions });
    });

    return res.json({ available: conflicts.length === 0, conflicts });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
