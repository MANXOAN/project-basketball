import { Moon, Sun, Sunrise } from "lucide-react";
import { fromMinutes, SLOT_MINUTES, toMinutes } from "../lib/bookingSchedule";

export type SlotAvailability = {
  /** Số ngày ô này đã có người đặt. */
  booked: number;
  /** Số ngày ô này đã qua giờ. */
  past: number;
  /** Tổng số ngày đang xét. */
  total: number;
};

type Props = {
  slots: string[];
  selected: ReadonlySet<string>;
  availability: (slot: string) => SlotAvailability;
  onToggle: (slot: string) => void;
  disabled?: boolean;
};

// Chỉ để trình bày: chia ô theo buổi cho dễ dò, thứ tự ô giữ nguyên.
const PERIODS = [
  { id: "morning", label: "Buổi sáng", icon: Sunrise, from: 0, to: 12 * 60 },
  { id: "afternoon", label: "Buổi chiều", icon: Sun, from: 12 * 60, to: 17 * 60 },
  { id: "evening", label: "Buổi tối", icon: Moon, from: 17 * 60, to: 24 * 60 },
];

export default function BookingSlotGrid({ slots, selected, availability, onToggle, disabled }: Props) {
  const multiDay = slots.length > 0 && availability(slots[0]).total > 1;
  const groups = PERIODS
    .map((period) => ({ ...period, slots: slots.filter((slot) => toMinutes(slot) >= period.from && toMinutes(slot) < period.to) }))
    .filter((period) => period.slots.length > 0);

  const renderSlot = (slot: string) => {
    const { booked, past, total } = availability(slot);
    const blockedDays = Math.min(total, booked + past);
    const fullyBlocked = total > 0 && blockedDays >= total;
    const partlyBooked = !fullyBlocked && booked > 0;
    const isSelected = selected.has(slot);
    const end = fromMinutes(toMinutes(slot) + SLOT_MINUTES);
    const status = fullyBlocked
      ? booked > 0 ? "đã có người đặt" : "đã qua"
      : partlyBooked ? `đã có người đặt ${booked}/${total} ngày` : "còn trống";
    return (
      <button
        key={slot}
        type="button"
        // Ô đang chọn luôn bấm được để bỏ chọn, kể cả khi vừa có người đặt.
        disabled={disabled || (fullyBlocked && !isSelected)}
        onClick={() => onToggle(slot)}
        aria-pressed={isSelected}
        aria-label={`${slot}–${end}, ${status}`}
        title={`${slot}–${end}: ${status}`}
        className={`slot-btn relative flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-[13px] font-bold tabular-nums ${
          isSelected && (fullyBlocked || partlyBooked)
            ? "border-rose-600 bg-rose-600 text-white shadow-[0_6px_16px_-8px_rgb(225_29_72/0.7)]"
            : isSelected
            ? "border-brand-600 bg-brand-600 text-white shadow-brand"
            : fullyBlocked && booked > 0
            ? "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-600 line-through decoration-rose-400"
            : fullyBlocked
            ? "cursor-not-allowed border-stone-100 bg-stone-100 text-stone-400"
            : partlyBooked
            ? "border-dashed border-rose-300 bg-white text-rose-700 hover:border-rose-500 hover:bg-rose-50/60"
            : "border-stone-200 bg-white text-stone-800 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
        } disabled:cursor-not-allowed`}
      >
        {slot}
        {partlyBooked && (
          <span className={`mt-0.5 block text-[10px] font-extrabold leading-none no-underline ${isSelected ? "text-white" : "text-rose-600"}`}>
            Trùng {booked} ngày
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      <div className="space-y-4">
        {groups.map((group) => {
          const Icon = group.icon;
          const picked = group.slots.filter((slot) => selected.has(slot)).length;
          return (
            <div key={group.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600">
                  <Icon className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {group.label}
                </span>
                {picked > 0 && <span className="text-[11px] font-bold text-brand-700">{picked} ô đã chọn</span>}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-8">
                {group.slots.map(renderSlot)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3 text-[11px] font-semibold text-stone-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-md border border-stone-300 bg-white" aria-hidden="true" /> Còn trống</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-md bg-brand-600" aria-hidden="true" /> Đang chọn</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-md border border-rose-200 bg-rose-50" aria-hidden="true" /> Đã có người đặt</span>
        {multiDay && <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-md border border-dashed border-rose-400 bg-white" aria-hidden="true" /> Trùng một số ngày</span>}
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-md bg-stone-200" aria-hidden="true" /> Đã qua</span>
        <span className="ml-auto text-stone-500">Mỗi ô = {SLOT_MINUTES} phút</span>
      </div>
    </div>
  );
}
