function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function weeklyDates(startDate, endDate) {
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return [];
  const dates = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return dates;
}

export function expandBookingSchedule({ date, recurringDates, time, scheduleSegments, occurrences: explicitOccurrences }) {
  const occurrences = [];
  if (Array.isArray(explicitOccurrences) && explicitOccurrences.length > 60) {
    throw new Error("Số buổi đặt tối đa là 60");
  }
  if (Array.isArray(explicitOccurrences) && explicitOccurrences.length) {
    explicitOccurrences.forEach((occurrence) => {
      const occurrenceDuration = occurrence?.duration == null ? undefined : Number(occurrence.duration);
      if (occurrenceDuration !== undefined && (!Number.isFinite(occurrenceDuration) || occurrenceDuration <= 0 || occurrenceDuration > 8)) {
        throw new Error("Thời lượng từng buổi không hợp lệ");
      }
      occurrences.push({ date: String(occurrence?.date || ""), time: String(occurrence?.time || ""), duration: occurrenceDuration, segmentIndex: 0 });
    });
  } else if (Array.isArray(scheduleSegments) && scheduleSegments.length) {
    if (scheduleSegments.length > 12) {
      throw new Error("Tối đa 12 giai đoạn đặt lịch");
    }
    scheduleSegments.forEach((segment, segmentIndex) => {
      const startDate = String(segment?.startDate || "");
      const endDate = String(segment?.endDate || startDate);
      const segmentTime = String(segment?.time || "");
      if (!isDate(startDate) || !isDate(endDate) || endDate < startDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(segmentTime)) {
        throw new Error(`Giai đoạn ${segmentIndex + 1} không hợp lệ`);
      }
      weeklyDates(startDate, endDate).forEach((occurrenceDate) => {
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
