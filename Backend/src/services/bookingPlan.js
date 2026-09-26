function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function datesInRange(startDate, endDate, frequency) {
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return [];
  const dates = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const stepDays = frequency === "daily" ? 1 : 7;
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + stepDays);
  }
  return dates;
}

export function expandBookingSchedule({ date, recurringDates, time, scheduleSegments, scheduleOccurrences }) {
  const occurrences = [];
  if (Array.isArray(scheduleOccurrences) && scheduleOccurrences.length) {
    if (scheduleOccurrences.length > 60) {
      throw new Error("Số buổi đặt phải từ 1 đến 60");
    }
    const seen = new Set();
    scheduleOccurrences.forEach((occurrence, index) => {
      const occurrenceDate = String(occurrence?.date || "");
      const occurrenceTime = String(occurrence?.time || "");
      const occurrenceDuration = occurrence?.duration == null ? undefined : Number(occurrence.duration);
      if (!isDate(occurrenceDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(occurrenceTime)) {
        throw new Error(`Buổi ${index + 1} không có ngày hoặc giờ hợp lệ`);
      }
      if (occurrenceDuration !== undefined && (!Number.isFinite(occurrenceDuration) || occurrenceDuration <= 0 || occurrenceDuration > 8)) {
        throw new Error(`Thời lượng buổi ${index + 1} không hợp lệ`);
      }
      const key = `${occurrenceDate}|${occurrenceTime}`;
      if (seen.has(key)) throw new Error(`Lịch có buổi bị trùng: ${occurrenceDate} ${occurrenceTime}`);
      seen.add(key);
      occurrences.push({ date: occurrenceDate, time: occurrenceTime, duration: occurrenceDuration, segmentIndex: index });
    });
  } else if (Array.isArray(scheduleSegments) && scheduleSegments.length) {
    if (scheduleSegments.length > 12) {
      throw new Error("Tối đa 12 giai đoạn đặt lịch");
    }
    scheduleSegments.forEach((segment, segmentIndex) => {
      const startDate = String(segment?.startDate || "");
      const endDate = String(segment?.endDate || startDate);
      const segmentTime = String(segment?.time || "");
      const frequency = String(segment?.frequency || "weekly");
      if (!isDate(startDate) || !isDate(endDate) || endDate < startDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(segmentTime)) {
        throw new Error(`Giai đoạn ${segmentIndex + 1} không hợp lệ`);
      }
      if (!["daily", "weekly"].includes(frequency)) {
        throw new Error(`Tần suất giai đoạn ${segmentIndex + 1} không hợp lệ`);
      }
      datesInRange(startDate, endDate, frequency).forEach((occurrenceDate) => {
        occurrences.push({ date: occurrenceDate, time: segmentTime, segmentIndex });
      });
    });
  } else {
    const dates = Array.isArray(recurringDates) && recurringDates.length ? recurringDates : [date];
    dates.forEach((occurrenceDate) => {
      occurrences.push({ date: String(occurrenceDate || ""), time: String(time || ""), segmentIndex: 0 });
    });
  }

  const unique = new Map();
  occurrences.forEach((occurrence) => {
    if (!isDate(occurrence.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(occurrence.time)) {
      throw new Error("Danh sách ngày hoặc khung giờ đặt sân không hợp lệ");
    }
    unique.set(`${occurrence.date}|${occurrence.time}`, occurrence);
  });
  const result = [...unique.values()].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );
  if (!result.length || result.length > 60) {
    throw new Error("Số buổi đặt phải từ 1 đến 60");
  }
  return result;
}

export function bookingModeFor(mode, occurrenceCount) {
  if (mode === "full_field") return "full_field";
  return occurrenceCount > 1 ? "recurring" : "single";
}
