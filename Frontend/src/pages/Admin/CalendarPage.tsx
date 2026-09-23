import { useEffect, useMemo, useState } from "react";
import { Calendar, Spin } from "antd";
import type { Dayjs } from "dayjs";
import { api, Booking } from "../../lib/api";
import { Info, CalendarDays, CircleCheck, Clock3, MapPin, UserRound, Timer } from "lucide-react";
import { createDemoBookings } from "../../data/demoData";

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    api
      .get<Booking[]>("/bookings")
      .then((res) => {
        const active = res.data.filter((b) => b.status !== "cancelled");
        setBookings(active.length ? active : createDemoBookings({ fullName: "Khách demo", phone: "0900000000" }));
      })
      .catch(() => setBookings(createDemoBookings({ fullName: "Khách demo", phone: "0900000000" })))
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
    return (
      <ul className="m-0 p-1 list-none space-y-1 h-full overflow-y-auto custom-scrollbar">
        {listData.map((item, index) => (
          <li key={index} className={`rounded p-1 text-xs mb-1 font-medium border-l-2 bg-white/50 backdrop-blur ${item.type === 'success' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : (item.type === 'warning' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-blue-500 text-blue-700 bg-blue-50/50')}`}>
            <div className="font-bold flex items-center justify-between">
              <span>{item.time}</span>
            </div>
            <div className="truncate text-[10px] opacity-80 mt-0.5">{item.customer}</div>
            <div className="truncate text-[10px] opacity-80 font-bold">{item.court}</div>
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
      <div className="flex justify-center items-center py-40">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400 mb-2"><CalendarDays size={14} /> Schedule control</div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Lịch Phân Bổ Sân
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Theo dõi lịch đặt sân trực quan theo từng ngày trong tháng</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 px-4 py-3 rounded-2xl shadow-xl border border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400"><CircleCheck size={14} /> Đã duyệt</div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400"><Clock3 size={14} /> Chờ duyệt</div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-white/5 p-6 overflow-hidden backdrop-blur-xl">
        <div className="mb-4 text-gray-500 text-sm flex items-center gap-2 px-4 pt-2">
          <Info size={16} className="text-yellow-400" />
          <span>Có tổng cộng <strong className="text-yellow-400 font-black">{bookings.length}</strong> ca đặt sân đang hoạt động trong hệ thống.</span>
        </div>
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Calendar
            cellRender={dateCellRender}
            onSelect={(value) => setSelectedDate(value.format("YYYY-MM-DD"))}
            className="custom-calendar overflow-hidden rounded-2xl"
          />

          <aside className="rounded-2xl border border-white/10 bg-black p-5 text-gray-200">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Lịch vận hành</div>
                <h2 className="mt-1 text-xl font-black text-white">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2>
              </div>
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-center">
                <div className="text-xl font-black text-yellow-400">{selectedBookings.length}</div>
                <div className="text-[9px] font-bold uppercase text-gray-500">Ca đặt</div>
              </div>
            </div>

            {selectedBookings.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <CalendarDays className="mb-3 h-9 w-9 text-zinc-700" />
                <div className="font-bold text-white">Ngày đang trống lịch</div>
                <p className="mt-1 max-w-48 text-xs leading-relaxed text-gray-500">Chưa có booking nào trong ngày được chọn.</p>
              </div>
            ) : (
              <div className="mt-4 max-h-[610px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {selectedBookings.map((booking) => (
                  <div key={booking.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:border-yellow-500/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-lg font-black text-yellow-400">{booking.time}</div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${booking.status === "confirmed" || booking.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {booking.status === "confirmed" ? "Đã duyệt" : booking.status === "completed" ? "Hoàn tất" : "Chờ duyệt"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-gray-400">
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-yellow-400" /> <span className="truncate font-bold text-white">{booking.court}</span></div>
                      <div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> {booking.customer?.fullName || "Khách vãng lai"}</div>
                      <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5" /> {booking.duration || 1} giờ · {booking.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán đủ"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      <style>{`
        .custom-calendar .ant-picker-calendar-date-content {
            height: 90px !important;
            overflow-y: hidden;
            transition: all 0.2s;
        }
        .custom-calendar .ant-picker-calendar-date:hover .ant-picker-calendar-date-content {
            overflow-y: auto;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 4px;
        }
        .custom-calendar .ant-picker-cell-selected .ant-picker-cell-inner {
            background-color: rgba(245,197,66,0.12) !important;
            border-radius: 12px !important;
        }
        .custom-calendar .ant-picker-calendar-date-value {
             font-weight: 700;
             color: #475569;
        }
        .custom-calendar .ant-picker-cell-selected .ant-picker-calendar-date-value {
             color: #f5c542;
        }
        .custom-calendar .ant-picker-cell-today .ant-picker-calendar-date-value {
             background: #f5c542;
             color: white;
             border-radius: 50%;
             width: 28px;
             height: 28px;
             display: flex;
             align-items: center;
             justify-content: center;
             margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
