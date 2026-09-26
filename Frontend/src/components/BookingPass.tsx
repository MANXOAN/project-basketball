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
    ? { label: "Đã sử dụng", className: "border-stone-300 bg-stone-100 text-stone-700" }
    : booking.status === "cancelled"
      ? { label: "Vé đã hủy", className: "border-rose-200 bg-rose-50 text-rose-700" }
      : booking.status === "confirmed"
        ? { label: "Vé hợp lệ", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
        : { label: paymentLabel, className: "border-brand-200 bg-brand-50 text-brand-800" };

  const infoTile = "rounded-2xl border border-stone-200 bg-surface p-3.5";

  return (
    <article data-booking-pass className="overflow-hidden rounded-3xl border border-stone-200 bg-white text-left text-stone-700 shadow-lift">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white">
        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border-[22px] border-white/10" aria-hidden="true" />
        <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full border-[18px] border-white/5" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-white/85">GoldenState Match Pass</div>
            <h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">Vé check-in điện tử</h3>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 text-right text-stone-900 shadow-soft">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Mã đặt sân</div>
            <button type="button" onClick={copyCode} className="mt-0.5 flex items-center gap-1.5 font-mono text-sm font-black text-brand-700 hover:text-brand-800" aria-label="Sao chép mã đặt sân">
              {passCode} <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-4">
          <div>
            <div className="eyebrow">Điểm đến</div>
            <div className="mt-1 text-xl font-extrabold text-stone-950">{booking.fieldName}</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-stone-700"><MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" /> {booking.court}</div>
            {booking.field?.address && <div className="mt-1 text-xs leading-5 text-stone-500">{[booking.field.address, booking.field.city].filter(Boolean).join(", ")}</div>}
          </div>

            {isGroupPass ? (
              <section className="rounded-2xl border border-stone-200 bg-surface p-3">
                <div className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">Lịch thi đấu · {groupSessions.length} buổi</div>
                <div className="max-h-72 divide-y divide-stone-200 overflow-y-auto print:max-h-none print:overflow-visible">
                  {groupSessions.map((session, index) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSessionSelect?.(session)}
                      disabled={!onSessionSelect}
                      className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-1 py-2.5 text-left text-xs transition hover:bg-brand-50 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <div>
                        <div className="font-bold text-stone-900">Buổi {index + 1} · {session.court}</div>
                        <div className="mt-0.5 text-stone-600">{formatDateVi(session.date)} · {formatSlotRange(session.time, session.duration || 1)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-900">{formatCurrency(session.total)}</div>
                        <div className="mt-0.5 font-semibold text-brand-700">Mở vé · BK{String(session.id).padStart(6, "0")}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className={infoTile}>
                  <CalendarDays className="mb-2 h-4 w-4 text-brand-600" aria-hidden="true" />
                  <div className="text-xs text-stone-500">Ngày thi đấu</div>
                  <div className="mt-0.5 text-sm font-bold text-stone-900">{formatDateVi(booking.date)}</div>
                </div>
                <div className={infoTile}>
                  <Clock3 className="mb-2 h-4 w-4 text-brand-600" aria-hidden="true" />
                  <div className="text-xs text-stone-500">Khung giờ</div>
                  <div className="mt-0.5 text-sm font-bold text-stone-900">{formatSlotRange(booking.time, booking.duration || 1)}</div>
                </div>
              </div>
            )}

          <div className={"grid grid-cols-1 gap-3 sm:grid-cols-2 " + infoTile}>
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs text-stone-500">Khách hàng</div>
                <div className="mt-0.5 text-sm font-bold text-stone-900">{booking.customer?.fullName || "—"}</div>
                <div className="mt-0.5 text-xs text-stone-600">{booking.customer?.phone || "Chưa có SĐT"}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs text-stone-500">Thanh toán</div>
                <div className="mt-0.5 text-sm font-bold text-stone-900">{paymentLabel}</div>
                <div className="mt-0.5 text-xs text-stone-600">{booking.paymentMethod === "cash" ? "Tiền mặt" : "Thanh toán điện tử"}</div>
                {isGroupPass && booking.paymentStatus === "deposit_paid" && (
                  <div className="mt-1 text-xs font-semibold text-stone-700">Đã cọc {formatCurrency(groupPaidAmount)} · còn {formatCurrency(Math.max(0, groupTotal - groupPaidAmount))}</div>
                )}
              </div>
            </div>
          </div>

          {(booking.services?.some((service) => Number(service.quantity) > 0) || booking.customer?.note) && (
            <div className={infoTile + " text-xs leading-5 text-stone-600"}>
              {booking.services?.some((service) => Number(service.quantity) > 0) && <div><span className="font-bold text-stone-800">Dịch vụ:</span> {booking.services.filter((service) => Number(service.quantity) > 0).map((service) => service.name + " × " + service.quantity).join(", ")}</div>}
              {booking.customer?.note && <div><span className="font-bold text-stone-800">Ghi chú:</span> {booking.customer.note}</div>}
            </div>
          )}

          <div className="relative flex flex-wrap items-end justify-between gap-4 border-t-2 border-dashed border-stone-200 pt-4">
            <div>
              <div className="text-xs text-stone-500">{isGroupPass ? "Tổng giá trị booking" : booking.groupSize && booking.groupSize > 1 ? "Giá trị buổi / Tổng nhóm" : "Tổng giá trị"}</div>
              <div className="text-2xl font-black tracking-tight text-stone-950">{formatCurrency(isGroupPass ? groupTotal : booking.total)}</div>
              {!isGroupPass && booking.groupSize && booking.groupSize > 1 && <div className="mt-0.5 text-xs font-bold text-stone-600">{formatCurrency(booking.groupTotal || booking.total)} · {booking.groupSize} buổi</div>}
            </div>
            <div className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold " + ticketState.className}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {ticketState.label}
            </div>
          </div>
        </div>

        {!isGroupPass && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-white p-3 text-center sm:w-48">
            <QRCode type="svg" value={qrContent} size={144} bordered={false} aria-label={"Mã QR check-in cho đơn " + passCode} />
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-stone-800">Quét để check-in</div>
            <div className="mt-1 max-w-36 break-all font-mono text-[9px] leading-3 text-stone-500">{qrContent}</div>
          </div>
        )}
      </div>

      <div className="booking-pass-actions grid grid-cols-1 gap-3 border-t border-stone-200 bg-surface p-4 sm:grid-cols-2">
        <button type="button" onClick={printTicket} className="btn-primary min-h-11 rounded-xl px-4 text-sm">
          <Printer className="h-4 w-4" aria-hidden="true" /> In / Lưu PDF
        </button>
        <button type="button" onClick={addToCalendar} className="btn-outline min-h-11 rounded-xl px-4 text-sm">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Thêm vào lịch
        </button>
      </div>
    </article>
  );
}
