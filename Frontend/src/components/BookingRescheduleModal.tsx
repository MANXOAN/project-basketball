import type { Dispatch, FormEvent, SetStateAction } from "react";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
      <form onSubmit={onSubmit} className="my-6 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Chỉ thay đổi buổi đã chọn</p>
            <h2 id="reschedule-title" className="mt-1 text-xl font-black text-slate-950">
              Đổi lịch BK{String(state.booking.id).padStart(6, "0")}
            </h2>
          </div>
          <button type="button" aria-label="Đóng cửa sổ đổi lịch" onClick={close} className="min-h-11 min-w-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100">×</button>
        </div>

        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <strong>Lịch cũ được giữ nguyên</strong> cho đến khi đổi thành công. Nếu sân mới đắt hơn, hệ thống sẽ chuyển sang VNPay để thu đúng phần chênh lệch.
        </p>
        {state.error && <div role="alert" tabIndex={-1} className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{state.error}</div>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Cơ sở
            <select value={state.fieldId} onChange={(event) => {
              const fieldId = Number(event.target.value);
              const firstCourt = state.courts.find((court) => court.fieldId === fieldId && court.status === "active");
              setState((current) => ({ ...current, fieldId, courtId: firstCourt?.id || 0 }));
            }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-amber-500">
              {state.fields.filter((field) => field.status === "active").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Sân con
            <select required value={state.courtId} onChange={(event) => setState((current) => ({ ...current, courtId: Number(event.target.value) }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-amber-500">
              <option value={0} disabled>Chọn sân</option>
              {state.courts.filter((court) => court.fieldId === state.fieldId && court.status === "active").map((court) => <option key={court.id} value={court.id}>{court.name} · {formatCurrency(court.price)}/giờ</option>)}
            </select>
          </label>
          <label htmlFor="reschedule-date" className="text-sm font-bold text-slate-700">Ngày mới
            <input id="reschedule-date" autoFocus required type="date" min={new Date().toISOString().slice(0, 10)} value={state.date} onChange={(event) => setState((current) => ({ ...current, date: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-amber-500" />
          </label>
          <label className="text-sm font-bold text-slate-700">Giờ mới
            <select required value={state.time} onChange={(event) => setState((current) => ({ ...current, time: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-amber-500">
              {TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Thời lượng
            <select value={state.duration} onChange={(event) => setState((current) => ({ ...current, duration: Number(event.target.value) }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-amber-500">
              {[1, 1.5, 2, 2.5, 3].map((duration) => <option key={duration} value={duration}>{duration} giờ</option>)}
            </select>
          </label>
          <label htmlFor="reschedule-reason" className="text-sm font-bold text-slate-700">Lý do
            <input id="reschedule-reason" value={state.reason} maxLength={500} onChange={(event) => setState((current) => ({ ...current, reason: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-amber-500" placeholder="Ví dụ: thay đổi lịch thi đấu" />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={close} className="min-h-11 flex-1 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100">Giữ lịch cũ</button>
          <button type="submit" disabled={state.submitting || !state.courtId} className="min-h-11 flex-1 rounded-xl bg-slate-950 font-bold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
            {state.submitting ? "Đang kiểm tra..." : "Kiểm tra và đổi lịch"}
          </button>
        </div>
      </form>
    </div>
  );
}
