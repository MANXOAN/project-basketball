import { QRCode } from "antd";
import { CalendarDays, CalendarPlus, Clock3, Copy, CreditCard, MapPin, Printer, ShieldCheck, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { Booking, formatCurrency, formatSlotRange } from "../lib/api";
import { formatDateVi } from "../lib/locale";

type TicketBooking = Booking & {
  field?: { address?: string; city?: string; phone?: string } | null;
};

type Props = {
  booking: TicketBooking;
  code?: string;
  sessions?: TicketBooking[];
  onSessionSelect?: (session: TicketBooking) => void;
};

function toIcsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default function BookingPass({ booking, code, sessions, onSessionSelect }: Props) {
  const groupSessions = sessions?.length ? sessions : [booking];
  const isGroupPass = groupSessions.length > 1;
  const passCode = code || (isGroupPass
    ? `BG${String(booking.id).padStart(6, "0")}`
    : `BK${String(booking.id).padStart(6, "0")}`);
  const qrContent = `CHECKIN-${passCode}|${booking.fieldName}|${booking.court}|${booking.date}|${booking.time}`;
  const groupTotal = Number(booking.groupTotal || groupSessions.reduce((sum, session) => sum + Number(session.total || 0), 0));
  const groupPaidAmount = groupSessions.reduce((sum, session) => sum + Number(session.paidAmount || 0), 0);

  const copyCode = async () => {
    await navigator.clipboard.writeText(passCode);
    toast.success("Đã sao chép mã đặt sân");
  };

  const printTicket = () => {
    window.print();
  };

  const addToCalendar = () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GoldenState//Booking Pass//VI",
      ...groupSessions.map((session) => [
        "BEGIN:VEVENT",
        `UID:BK${session.id}@goldenstate.vn`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(new Date(`${session.date}T${session.time}:00`))}`,
        `DTEND:${toIcsDate(new Date(new Date(`${session.date}T${session.time}:00`).getTime() + (session.duration || 1) * 60 * 60 * 1000))}`,
        `SUMMARY:Đặt sân ${session.court} - ${session.fieldName}`,
        `LOCATION:${session.fieldName}`,
        `DESCRIPTION:Mã đặt sân BK${session.id}. Xuất trình QR khi check-in.`,
        "END:VEVENT",
      ].join("\r\n")),
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${passCode}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const paymentLabel = booking.paymentStatus === "paid"
    ? "Đã thanh toán"
    : booking.paymentStatus === "deposit_paid"
      ? "Đã đặt cọc 30%"
      : booking.paymentMethod === "cash"
        ? "Thanh toán tại sân"
        : "Chờ thanh toán";
  const ticketState = booking.status === "completed"
    ? { label: "Đã sử dụng", className: "border-slate-500/25 bg-slate-500/10 text-slate-300" }
    : booking.status === "cancelled"
      ? { label: "Vé đã hủy", className: "border-rose-500/25 bg-rose-500/10 text-rose-400" }
      : booking.status === "confirmed"
        ? { label: "Vé hợp lệ", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" }
        : { label: paymentLabel, className: "border-amber-500/25 bg-amber-500/10 text-amber-300" };

  return (
    <article data-booking-pass className="overflow-hidden rounded-3xl border border-yellow-500/30 bg-zinc-950 text-left shadow-2xl">
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
              {passCode} <Copy className="h-3.5 w-3.5" />
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
            {booking.field?.address && <div className="mt-1 text-xs leading-5 text-gray-500">{[booking.field.address, booking.field.city].filter(Boolean).join(", ")}</div>}
          </div>

            {isGroupPass ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">Lịch thi đấu · {groupSessions.length} buổi</div>
                <div className="divide-y divide-white/10">
                  {groupSessions.map((session, index) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSessionSelect?.(session)}
                      disabled={!onSessionSelect}
                      className="grid w-full grid-cols-[1fr_auto] gap-3 py-2.5 text-left text-xs transition hover:bg-white/[0.04] disabled:cursor-default"
                    >
                      <div>
                        <div className="font-bold text-white">Buổi {index + 1} · {session.court}</div>
                        <div className="mt-0.5 text-gray-400">{formatDateVi(session.date)} · {formatSlotRange(session.time, session.duration || 1)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{formatCurrency(session.total)}</div>
                        <div className="mt-0.5 text-yellow-300">Mở vé · BK{String(session.id).padStart(6, "0")}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
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
            )}

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              <div>
                <div className="text-xs text-gray-500">Khách hàng</div>
                <div className="mt-0.5 text-sm font-bold text-white">{booking.customer?.fullName || "—"}</div>
                <div className="mt-0.5 text-xs text-gray-400">{booking.customer?.phone || "Chưa có SĐT"}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              <div>
                <div className="text-xs text-gray-500">Thanh toán</div>
                <div className="mt-0.5 text-sm font-bold text-white">{paymentLabel}</div>
                <div className="mt-0.5 text-xs text-gray-400">{booking.paymentMethod === "cash" ? "Tiền mặt" : "Thanh toán điện tử"}</div>
                {isGroupPass && booking.paymentStatus === "deposit_paid" && (
                  <div className="mt-1 text-xs text-gray-300">Đã cọc {formatCurrency(groupPaidAmount)} · còn {formatCurrency(Math.max(0, groupTotal - groupPaidAmount))}</div>
                )}
              </div>
            </div>
          </div>

          {(booking.services?.some((service) => Number(service.quantity) > 0) || booking.customer?.note) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-gray-400">
              {booking.services?.some((service) => Number(service.quantity) > 0) && <div><span className="font-bold text-gray-300">Dịch vụ:</span> {booking.services.filter((service) => Number(service.quantity) > 0).map((service) => service.name + " × " + service.quantity).join(", ")}</div>}
              {booking.customer?.note && <div><span className="font-bold text-gray-300">Ghi chú:</span> {booking.customer.note}</div>}
            </div>
          )}

          <div className="flex items-end justify-between gap-4 border-t border-dashed border-white/10 pt-4">
            <div>
              <div className="text-xs text-gray-500">{isGroupPass ? "Tổng giá trị booking" : booking.groupSize && booking.groupSize > 1 ? "Giá trị buổi / Tổng nhóm" : "Tổng giá trị"}</div>
              <div className="text-xl font-black text-yellow-400">{formatCurrency(isGroupPass ? groupTotal : booking.total)}</div>
              {!isGroupPass && booking.groupSize && booking.groupSize > 1 && <div className="mt-0.5 text-xs font-bold text-gray-400">{formatCurrency(booking.groupTotal || booking.total)} · {booking.groupSize} buổi</div>}
            </div>
            <div className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold " + ticketState.className}>
              <ShieldCheck className="h-3.5 w-3.5" /> {ticketState.label}
            </div>
          </div>
        </div>

        {!isGroupPass && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 text-center sm:w-44">
            <QRCode type="svg" value={qrContent} size={144} bordered={false} aria-label={"Mã QR check-in cho đơn " + passCode} />
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-700">Quét để check-in</div>
            <div className="mt-1 max-w-36 break-all font-mono text-[9px] leading-3 text-zinc-500">{qrContent}</div>
          </div>
        )}
      </div>

      <div className="booking-pass-actions grid grid-cols-1 gap-3 border-t border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
        <button type="button" onClick={printTicket} className="btn-primary flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold">
          <Printer className="h-4 w-4" /> In / Lưu PDF
        </button>
        <button type="button" onClick={addToCalendar} className="btn-outline flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold">
          <CalendarPlus className="h-4 w-4" /> Thêm vào lịch
        </button>
      </div>
    </article>
  );
}
