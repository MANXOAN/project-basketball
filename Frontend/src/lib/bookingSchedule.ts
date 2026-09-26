// Tiện ích dựng lịch đặt sân: mỗi ngày là một tập ô 30 phút, các ô liền nhau
// gộp thành một khung giờ (một buổi gửi lên backend).

export type RecurrencePreset = "single" | "daily" | "weekly" | "monthly";

export type ScheduleDraft = {
  preset: RecurrencePreset;
  startDate: string;
  endDate: string;
  weekdays: number[];
  months: number;
  slots: string[];
  dayOverrides: Record<string, string[]>;
};

export type TimeFrame = { time: string; duration: number };

export const SLOT_MINUTES = 30;
export const MAX_OCCURRENCES = 60;
export const MIN_FRAME_HOURS = 1;
export const MAX_FRAME_HOURS = 8;

export const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const toMinutes = (value: string): number => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + (minute || 0);
};

export const fromMinutes = (value: number): string =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export const addDaysIso = (value: string, days: number): string => {
  const next = new Date(value + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

export const weekdayOf = (iso: string): number => new Date(iso + "T00:00:00Z").getUTCDay();

export const formatDateVi = (iso: string): string =>
  `${WEEKDAY_LABELS[weekdayOf(iso)]} ${iso.split("-").reverse().join("/")}`;

export const frameEnd = (frame: TimeFrame): string => fromMinutes(toMinutes(frame.time) + frame.duration * 60);

export const cellsOf = (time: string, duration: number): string[] =>
  Array.from({ length: Math.ceil(duration * 60 / SLOT_MINUTES) }, (_, index) => fromMinutes(toMinutes(time) + index * SLOT_MINUTES));

export const sortSlots = (slots: Iterable<string>): string[] =>
  [...new Set(slots)].sort((a, b) => toMinutes(a) - toMinutes(b));

/** Gộp các ô 30 phút liền nhau thành khung giờ liên tục. */
export function slotsToFrames(slots: Iterable<string>): TimeFrame[] {
  const frames: TimeFrame[] = [];
  let start = -1;
  let previous = -1;
  for (const slot of sortSlots(slots)) {
    const minute = toMinutes(slot);
    if (start >= 0 && minute === previous + SLOT_MINUTES) {
      previous = minute;
      continue;
    }
    if (start >= 0) frames.push({ time: fromMinutes(start), duration: (previous + SLOT_MINUTES - start) / 60 });
    start = minute;
    previous = minute;
  }
  if (start >= 0) frames.push({ time: fromMinutes(start), duration: (previous + SLOT_MINUTES - start) / 60 });
  return frames;
}

export const rangesOverlap = (aTime: string, aDuration: number, bTime: string, bDuration: number): boolean => {
  const a0 = toMinutes(aTime);
  const b0 = toMinutes(bTime);
  return a0 < b0 + bDuration * 60 && b0 < a0 + aDuration * 60;
};

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Danh sách ngày theo kiểu lịch. Trả tối đa MAX_OCCURRENCES + 1 ngày để nơi gọi phát hiện vượt giới hạn. */
export function expandScheduleDates(draft: Pick<ScheduleDraft, "preset" | "startDate" | "endDate" | "weekdays" | "months">): string[] {
  const { preset, startDate, endDate } = draft;
  if (!startDate) return [];
  if (preset === "single") return [startDate];

  const dates: string[] = [];
  if (preset === "monthly") {
    const [year, month, day] = startDate.split("-").map(Number);
    for (let index = 0; index < Math.max(1, draft.months) && dates.length <= MAX_OCCURRENCES; index += 1) {
      const monthIndex = month - 1 + index;
      const targetYear = year + Math.floor(monthIndex / 12);
      const targetMonth = monthIndex % 12;
      // Ngày 29–31 không có ở tháng ngắn thì lấy ngày cuối tháng.
      const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
      dates.push(`${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`);
    }
    return dates;
  }

  if (!endDate || endDate < startDate) return [startDate];
  const weekdays = new Set(draft.weekdays.length ? draft.weekdays : [weekdayOf(startDate)]);
  for (let current = startDate; current <= endDate && dates.length <= MAX_OCCURRENCES; current = addDaysIso(current, 1)) {
    if (preset === "daily" || weekdays.has(weekdayOf(current))) dates.push(current);
  }
  return dates;
}
