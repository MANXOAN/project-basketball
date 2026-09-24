const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export const vietnamTodayIso = (nowMs = Date.now()) =>
  new Date(nowMs + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);

export const isPastVietnamSlot = (
  slotDate: string,
  slotTime: string,
  nowMs = Date.now(),
) => {
  if (!slotDate || !slotTime) return false;

  const vietnamNow = new Date(nowMs + VIETNAM_OFFSET_MS);
  const today = vietnamNow.toISOString().slice(0, 10);
  if (slotDate < today) return true;
  if (slotDate > today) return false;

  const [hour, minute] = slotTime.split(":").map(Number);
  const currentMinute = vietnamNow.getUTCHours() * 60 + vietnamNow.getUTCMinutes();
  return hour * 60 + minute <= currentMinute;
};
