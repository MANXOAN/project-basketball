import type { Dispatch, FormEvent, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CalendarClock, Info, X } from "lucide-react";
import { formatCurrency, TIME_SLOTS, type Booking, type Court, type Field } from "../lib/api";

export type RescheduleModalState = {
  isOpen: boolean;
  booking: Booking | null;
  fields: Field[];
  courts: Court[];
  fieldId: number;
  courtId: number;
  date: string;
  time: string;
  duration: number;
  reason: string;
  submitting: boolean;
  error: string;
};

type Props = {
  state: RescheduleModalState;
  setState: Dispatch<SetStateAction<RescheduleModalState>>;
  onSubmit: (event: FormEvent) => void;
};

export default function BookingRescheduleModal({ state, setState, onSubmit }: Props) {
  if (!state.isOpen || !state.booking) return null;
  const close = () => setState((current) => ({ ...current, isOpen: false }));

  const control = "input mt-2 text-sm font-medium normal-case tracking-normal";
  const label = "text-xs font-bold uppercase tracking-wider text-stone-600";

  // Portal ra body: .page-enter (transform) ở layout làm lệch position: fixed.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-stone-950/50 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
      <form onSubmit={onSubmit} className="w-full max-w-xl rounded-t-3xl border border-stone-200 bg-white p-5 shadow-lift animate-fade-in-up sm:my-6 sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100" aria-hidden="true"><CalendarClock className="h-5 w-5" /></span>
            <div>
              <p className="eyebrow">Chỉ thay đổi buổi đã chọn</p>
              <h2 id="reschedule-title" className="mt-0.5 text-xl font-extrabold text-stone-950">
                Đổi lịch BK{String(state.booking.id).padStart(6, "0")}
              </h2>
            </div>
          </div>
          <button type="button" aria-label="Đóng cửa sổ đổi lịch" onClick={close} className="btn-outline grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>

        <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm leading-6 text-stone-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span><strong className="text-stone-900">Lịch cũ được giữ nguyên</strong> cho đến khi đổi thành công. Nếu sân mới đắt hơn, hệ thống sẽ chuyển sang VNPay để thu đúng phần chênh lệch.</span>
        </p>
        {state.error && <div role="alert" tabIndex={-1} className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{state.error}</span></div>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={label}>Cơ sở
            <select value={state.fieldId} onChange={(event) => {
              const fieldId = Number(event.target.value);
              const firstCourt = state.courts.find((court) => court.fieldId === fieldId && court.status === "active");
              setState((current) => ({ ...current, fieldId, courtId: firstCourt?.id || 0 }));
            }} className={control}>
              {state.fields.filter((field) => field.status === "active").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
          <label className={label}>Sân con
            <select required value={state.courtId} onChange={(event) => setState((current) => ({ ...current, courtId: Number(event.target.value) }))} className={control}>
              <option value={0} disabled>Chọn sân</option>
              {state.courts.filter((court) => court.fieldId === state.fieldId && court.status === "active").map((court) => <option key={court.id} value={court.id}>{court.name} · {formatCurrency(court.price)}/giờ</option>)}
            </select>
          </label>
          <label htmlFor="reschedule-date" className={label}>Ngày mới
            <input id="reschedule-date" autoFocus required type="date" min={new Date().toISOString().slice(0, 10)} value={state.date} onChange={(event) => setState((current) => ({ ...current, date: event.target.value }))} className={control} style={{ colorScheme: "light" }} />
          </label>
          <label className={label}>Giờ mới
            <select required value={state.time} onChange={(event) => setState((current) => ({ ...current, time: event.target.value }))} className={control}>
              {TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
          <label className={label}>Thời lượng
            <select value={state.duration} onChange={(event) => setState((current) => ({ ...current, duration: Number(event.target.value) }))} className={control}>
              {[1, 1.5, 2, 2.5, 3].map((duration) => <option key={duration} value={duration}>{duration} giờ</option>)}
            </select>
          </label>
          <label htmlFor="reschedule-reason" className={label}>Lý do
            <input id="reschedule-reason" value={state.reason} maxLength={500} onChange={(event) => setState((current) => ({ ...current, reason: event.target.value }))} className={control + " placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400"} placeholder="Ví dụ: thay đổi lịch thi đấu" />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={close} className="btn-outline min-h-12 flex-1 rounded-xl text-sm">Giữ lịch cũ</button>
          <button type="submit" disabled={state.submitting || !state.courtId} className="btn-primary min-h-12 flex-1 rounded-xl text-sm disabled:opacity-50">
            {state.submitting ? "Đang kiểm tra..." : "Kiểm tra và đổi lịch"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
