import { useEffect, useMemo, useState } from "react";
import { Calendar, Grid } from "antd";
import type { Dayjs } from "dayjs";
import { api, Booking } from "../../lib/api";
import { Info, CalendarDays, CircleCheck, Clock3, MapPin, UserRound, Timer } from "lucide-react";

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const screens = Grid.useBreakpoint();
  // Màn hình hẹp: dùng lịch thu gọn (chấm màu) và xem chi tiết ở danh sách bên dưới.
  const compact = !screens.md;

  useEffect(() => {
    api
      .get<Booking[]>("/bookings")
      .then((res) => {
        const active = res.data.filter((b) => b.status !== "cancelled");
        setBookings(active);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const getListData = (value: Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    return bookings
      .filter((b) => b.date === dateStr)
      .map((b) => ({
        type:
          b.status === "confirmed" || b.status === "completed"
            ? "success"
            : b.status === "pending"
              ? "warning"
              : "default",
        time: b.time,
        customer: b.customer?.fullName || "Khách",
        court: b.court
      }));
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    if (listData.length === 0) return null;
    if (compact) {
      const hasPending = listData.some((item) => item.type === "warning");
      const hasOk = listData.some((item) => item.type === "success");
      return (
        <span className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5" aria-label={`${listData.length} ca đặt`}>
          {hasOk && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          {hasPending && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
        </span>
      );
    }
    return (
      <ul className="m-0 h-full list-none space-y-1 overflow-y-auto p-0.5 custom-scrollbar">
        {listData.map((item, index) => (
          <li key={index} className={`rounded-md border-l-[3px] px-1.5 py-1 text-xs font-medium ${item.type === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : (item.type === 'warning' ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-stone-400 bg-stone-100 text-stone-700')}`}>
            <div className="font-bold tabular-nums">{item.time}</div>
            <div className="mt-0.5 truncate text-[11px] opacity-90">{item.customer}</div>
            <div className="truncate text-[11px] font-semibold opacity-90">{item.court}</div>
          </li>
        ))}
      </ul>
    );
  };

  const selectedBookings = useMemo(
    () => bookings.filter((booking) => booking.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, selectedDate]
  );

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true" aria-label="Đang tải lịch">
        <div className="skeleton h-[640px] !rounded-3xl" />
        <div className="skeleton h-[640px] !rounded-3xl" />
      </div>
    );
  }

  const confirmedCount = selectedBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 flex items-center gap-2 text-sm text-stone-600">
          <Info size={16} className="shrink-0 text-brand-600" aria-hidden="true" />
          <span>Có <strong className="font-extrabold text-stone-900">{bookings.length}</strong> ca đặt sân đang hoạt động. Chọn một ngày để xem chi tiết.</span>
        </p>
        <div className="flex items-center gap-2" aria-label="Chú thích màu">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"><CircleCheck size={13} aria-hidden="true" /> Đã duyệt</span>
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand-800"><Clock3 size={13} aria-hidden="true" /> Chờ duyệt</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 overflow-hidden p-3 sm:p-5" aria-label="Lịch tháng">
          <div className={compact ? "" : "overflow-x-auto"}>
            <div className={compact ? "" : "min-w-[680px]"}>
              <Calendar
                fullscreen={!compact}
                cellRender={dateCellRender}
                onSelect={(value) => setSelectedDate(value.format("YYYY-MM-DD"))}
                className="custom-calendar"
              />
            </div>
          </div>
        </section>

        <aside className="card flex flex-col self-start p-5 xl:sticky xl:top-24" aria-labelledby="day-title">
          <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="min-w-0">
              <div className="eyebrow">Lịch vận hành</div>
              <h2 id="day-title" className="m-0 mt-1 text-lg font-extrabold capitalize text-stone-950">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2>
              <p className="m-0 mt-0.5 text-xs text-stone-500">{confirmedCount} đã duyệt · {selectedBookings.length - confirmedCount} chờ duyệt</p>
            </div>
            <div className="shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-center ring-1 ring-brand-100">
              <div className="text-xl font-extrabold text-brand-700 tabular-nums">{selectedBookings.length}</div>
              <div className="text-[10px] font-bold uppercase text-brand-800">Ca đặt</div>
            </div>
          </div>

          {selectedBookings.length === 0 ? (
            <div className="flex min-h-64 flex-1 flex-col items-center justify-center text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400"><CalendarDays size={22} aria-hidden="true" /></span>
              <div className="font-bold text-stone-900">Ngày đang trống lịch</div>
              <p className="m-0 mt-1 max-w-52 text-xs leading-relaxed text-stone-500">Chưa có booking nào trong ngày được chọn.</p>
            </div>
          ) : (
            <ul className="m-0 mt-4 max-h-[610px] list-none space-y-3 overflow-y-auto p-0 pr-1 custom-scrollbar">
              {selectedBookings.map((booking) => {
                const ok = booking.status === "confirmed" || booking.status === "completed";
                return (
                  <li key={booking.id} className={`rounded-2xl border border-stone-200 border-l-4 bg-white p-4 transition-colors hover:border-brand-300 ${ok ? "!border-l-emerald-500" : "!border-l-brand-500"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-extrabold text-stone-950 tabular-nums">{booking.time}</div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${ok ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-brand-50 text-brand-800 ring-brand-200"}`}>
                        {booking.status === "confirmed" ? "Đã duyệt" : booking.status === "completed" ? "Hoàn tất" : "Chờ duyệt"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" /> <span className="truncate font-bold text-stone-900">{booking.court}</span></div>
                      <div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" /> <span className="truncate">{booking.customer?.fullName || "Khách vãng lai"}</span></div>
                      <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" /> {booking.duration || 1} giờ · {booking.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán đủ"}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <style>{`
        .custom-calendar.ant-picker-calendar { background: transparent; }
        .custom-calendar .ant-picker-calendar-header { padding: 4px 0 12px; }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-calendar-header { padding: 4px 0 8px; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-panel { border-top: 0; }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-content { height: auto !important; }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-cell-inner { width: 40px; height: 40px; line-height: 34px; border-radius: 12px !important; }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-calendar-date-value { line-height: 34px; }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner { background: #fff7ed !important; box-shadow: inset 0 0 0 1px #fdba74; }
        .custom-calendar.ant-picker-calendar-full .ant-picker-calendar-date-content {
            height: 84px !important;
            overflow-y: hidden;
        }
        .custom-calendar .ant-picker-calendar-date:hover .ant-picker-calendar-date-content {
            overflow-y: auto;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d6d3d1; border-radius: 4px; }
        .custom-calendar.ant-picker-calendar-full .ant-picker-cell .ant-picker-calendar-date { border-radius: 12px !important; margin: 0 3px !important; border-top-width: 2px !important; }
        .custom-calendar .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-calendar-date {
            background-color: #fff7ed !important;
            border-top-color: #f97316 !important;
        }
        .custom-calendar .ant-picker-calendar-date-value { font-weight: 700; color: #57534e; }
        .custom-calendar .ant-picker-cell:not(.ant-picker-cell-in-view) .ant-picker-calendar-date-value { color: #a8a29e; }
        .custom-calendar .ant-picker-cell-selected .ant-picker-calendar-date-value { color: #b23d0a !important; }
        .custom-calendar.ant-picker-calendar-full .ant-picker-cell-today .ant-picker-calendar-date-value {
            display: inline-grid; place-items: center;
            width: 26px; height: 26px; border-radius: 999px;
            background: #cf4a0c; color: #fff !important;
        }
        .custom-calendar.ant-picker-calendar-mini .ant-picker-cell-today .ant-picker-cell-inner::before { border-color: #f97316 !important; border-radius: 12px; }
      `}</style>
    </div>
  );
}
