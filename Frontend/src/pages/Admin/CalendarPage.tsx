import { useEffect, useState } from "react";
import { Calendar, Spin } from "antd";
import type { Dayjs } from "dayjs";
import { api, Booking } from "../../lib/api";
import { Info, CalendarDays, CircleCheck, Clock3 } from "lucide-react";

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Booking[]>("/bookings")
      .then((res) => setBookings(res.data.filter((b) => b.status !== "cancelled")))
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
        <Calendar
          cellRender={dateCellRender}
          className="custom-calendar rounded-2xl overflow-hidden mt-4"
        />
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
