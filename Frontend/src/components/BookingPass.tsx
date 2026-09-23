import { CalendarDays, CalendarPlus, Clock3, Copy, MapPin, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Booking, formatCurrency, formatSlotRange } from "../lib/api";
import { formatDateVi } from "../lib/locale";

type Props = {
  booking: Booking;
  code?: string;
};

function toIcsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default function BookingPass({ booking, code = `BK${String(booking.id).padStart(6, "0")}` }: Props) {
  const qrContent = `CHECKIN-${code}|${booking.fieldName}|${booking.court}|${booking.date}|${booking.time}`;
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrContent)}&size=280`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success("Đã sao chép mã đặt sân");
  };

  const addToCalendar = () => {
    const start = new Date(`${booking.date}T${booking.time}:00`);
    const end = new Date(start.getTime() + (booking.duration || 1) * 60 * 60 * 1000);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GoldenState//Booking Pass//VI",
      "BEGIN:VEVENT",
      `UID:${code}@goldenstate.vn`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:Đặt sân ${booking.court} - ${booking.fieldName}`,
      `LOCATION:${booking.fieldName}`,
      `DESCRIPTION:Mã đặt sân ${code}. Xuất trình QR khi check-in.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${code}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-yellow-500/30 bg-zinc-950 text-left shadow-2xl">
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-yellow-500 via-amber-400 to-yellow-600 p-6 text-black">
        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border-[22px] border-black/5" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em]">GoldenState Match Pass</div>
            <h3 className="mt-1 text-3xl font-black">Vé check-in điện tử</h3>
          </div>
          <div className="rounded-xl border border-black/10 bg-black/10 px-3 py-2 text-right">
            <div className="text-[9px] font-bold uppercase tracking-wider">Mã đặt sân</div>
            <button type="button" onClick={copyCode} className="mt-0.5 flex items-center gap-1 font-mono text-sm font-black" aria-label="Sao chép mã đặt sân">
              {code} <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-yellow-400">Điểm đến</div>
            <div className="mt-1 text-xl font-black text-white">{booking.fieldName}</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400"><MapPin className="h-4 w-4 text-yellow-400" /> {booking.court}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <CalendarDays className="mb-2 h-4 w-4 text-yellow-400" />
              <div className="text-xs text-gray-500">Ngày thi đấu</div>
              <div className="mt-0.5 text-sm font-bold text-white">{formatDateVi(booking.date)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <Clock3 className="mb-2 h-4 w-4 text-yellow-400" />
              <div className="text-xs text-gray-500">Khung giờ</div>
              <div className="mt-0.5 text-sm font-bold text-white">{formatSlotRange(booking.time, booking.duration || 1)}</div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-dashed border-white/10 pt-4">
            <div>
              <div className="text-xs text-gray-500">Tổng giá trị</div>
              <div className="text-xl font-black text-yellow-400">{formatCurrency(booking.total)}</div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Vé hợp lệ
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 text-center sm:w-44">
          <img src={qrUrl} alt={`Mã QR check-in cho đơn ${code}`} className="aspect-square w-36 object-contain" />
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-700">Quét để check-in</div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/[0.02] p-4">
        <button type="button" onClick={addToCalendar} className="btn-outline flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold">
          <CalendarPlus className="h-4 w-4" /> Thêm vào lịch cá nhân
        </button>
      </div>
    </article>
  );
}
