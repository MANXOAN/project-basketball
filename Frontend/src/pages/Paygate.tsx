import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { QrCode, CheckCircle2, Loader2, ArrowLeft, CreditCard, Clock, ShieldCheck, Copy, AlertTriangle, Lock } from "lucide-react";
import { formatCurrency, api } from "../lib/api";
import toast from "react-hot-toast";
import axios from "axios";

export default function Paygate() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"card" | "transfer" | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [returningToBooking, setReturningToBooking] = useState(false);

  const payload = location.state?.payload;
  const existingBooking = location.state?.booking;
  const balanceBooking = location.state?.balanceBooking;
  const total = location.state?.total;
  const paymentDeadline = existingBooking?.paymentExpiresAt || null;
  const [timeLeft, setTimeLeft] = useState(() => paymentDeadline
    ? Math.max(0, Math.ceil((new Date(paymentDeadline).getTime() - Date.now()) / 1000))
    : 15 * 60);

  // Đếm ngược mỗi giây
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && existingBooking?.id) {
      api.get(`/bookings/${existingBooking.id}`).catch(() => undefined);
    }
  }, [timeLeft, existingBooking?.id]);

  // Format số giây sang kiểu MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!payload && !existingBooking && !balanceBooking) {
    return (
      <div className="min-h-[70vh] bg-surface brand-grid flex flex-col items-center justify-center py-20 px-4">
        <div className="card max-w-md w-full p-8 text-center animate-scale-in">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-extrabold text-stone-950 mb-2">Không tìm thấy thông tin đơn hàng</h2>
          <p className="text-stone-600 text-sm mb-7">Phiên thanh toán có thể đã hết hạn hoặc dữ liệu không tồn tại.</p>
          <Link to="/" className="btn-primary w-full min-h-12 rounded-xl">
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const isBalancePayment = Boolean(balanceBooking);
  const booking = balanceBooking || existingBooking || payload;
  const isGroupedBooking = Boolean(booking.bookingGroupId && Number(booking.groupSize) > 1);
  const groupSchedule: Array<{ date: string; time: string; duration?: number }> = Array.isArray(booking.schedule)
    ? booking.schedule
    : [];
  const requestedSessionCount = Array.isArray(payload?.occurrences)
    ? payload.occurrences.length
    : 1;
  const savedSessionCount = Number(booking.groupSize || groupSchedule.length || 1);
  const scheduleCountMismatch = requestedSessionCount > 1 && requestedSessionCount !== savedSessionCount;
  const persistedGroupTotal = Number(booking.groupTotal || 0);
  const bookingTotal = persistedGroupTotal > 0
    ? persistedGroupTotal
    : Number(total ?? booking.total ?? 0);
  const requestedTotal = Number(payload?.total ?? total ?? 0);
  const totalMismatch = requestedTotal > 0 && Math.round(requestedTotal) !== Math.round(bookingTotal);
  const bookingDataMismatch = scheduleCountMismatch || totalMismatch;
  const groupPaidAmount = Number(booking.groupPaidAmount ?? booking.paidAmount ?? (booking.paymentStatus === "deposit_paid" ? Math.round(bookingTotal * 0.3) : 0));
  const amountToPay = isBalancePayment
    ? Math.max(0, bookingTotal - groupPaidAmount)
    : booking.paymentMethod === "deposit" ? Math.round(bookingTotal * 0.3) : bookingTotal;
  const paymentKind = isBalancePayment ? "balance" : booking.paymentMethod === "deposit" ? "deposit" : "full";
  const paymentSchedule = Array.isArray(booking.schedule)
    ? booking.schedule
    : Array.isArray(booking.groupSchedule)
      ? booking.groupSchedule
      : Array.isArray(payload?.occurrences)
      ? payload.occurrences
      : booking.date && booking.time
        ? [{ date: booking.date, time: booking.time }]
        : [];

  const handleConfirmPayment = async () => {
    if (bookingDataMismatch) {
      toast.error("Tổng tiền hoặc số buổi của booking không khớp. Chưa thể thanh toán.");
      return;
    }
    if (!tab) {
      toast.error("Vui lòng chọn VNPay hoặc VietQR để tiếp tục");
      return;
    }
    if (timeLeft <= 0 && !isBalancePayment) {
      toast.error("Đơn đã hết hạn thanh toán. Vui lòng tạo đơn mới.");
      return;
    }
    if (tab === "card" && (!Number.isInteger(Number(amountToPay)) || Number(amountToPay) <= 0)) {
      toast.error("Số tiền thanh toán không hợp lệ");
      return;
    }
    setLoading(true);
    try {
      // Booking thường đã được tạo từ trang Đặt sân; không tạo lần hai ở đây.
      const res = (isBalancePayment || existingBooking) ? { data: booking } : await api.post("/bookings", payload);

      if (tab === "card") {
        const vnpayRes = await api.post("/vnpay/create-url", {
          amount: Number(amountToPay),
          orderId: String(res.data.id),
          paymentKind,
          language: "vn",
        });
        if (!vnpayRes.data?.paymentUrl) {
          throw new Error("Backend không trả về liên kết VNPay");
        }
        window.location.href = vnpayRes.data.paymentUrl;
        return;
      }

      // VietQR không có webhook trong dự án hiện tại, vì vậy không được tự ghi
      // nhận là đã thanh toán. Đơn vẫn giữ trạng thái unpaid để khách trả tiếp.
      toast("Đơn đang chờ xác thực chuyển khoản.", { icon: "⏳" });
      navigate("/my-bookings", {
        state: {
          successId: res.data.id,
          paymentMethod: isBalancePayment ? "balance" : booking.paymentMethod,
          payload: booking,
          isAutoTransfer: false,
        },
      });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof Error
        ? error.message
        : undefined;
      toast.error(message || "Thanh toán thất bại");
      setLoading(false);
    }
  };

  // Cấu hình Ngân hàng
  const BANK_ID = "MB";
  const ACCOUNT_NO = "5510355155442";
  const ACCOUNT_NAME = "NGUYEN THANH TU";
  const addInfo = `DATSAN BK${booking.id || booking.customer?.phone || ""}`;
  const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(
    addInfo
  )}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };
  const handleReturnToBooking = async () => {
    if (isBalancePayment) {
      navigate("/my-bookings", { replace: true });
      return;
    }

    setReturningToBooking(true);
    try {
      if (existingBooking?.id && existingBooking.paymentStatus === "unpaid") {
        await api.post(`/bookings/${existingBooking.id}/cancel`, {});
      }
      const draft = payload || booking;
      const search = new URLSearchParams({
        fieldId: String(draft.fieldId || ""),
        courtId: String(draft.courtId || ""),
        date: String(draft.date || ""),
        time: String(draft.time || ""),
      });
      navigate(`/booking?${search.toString()}`, {
        replace: true,
        state: { bookingDraft: draft },
      });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof Error
          ? error.message
          : undefined;
      toast.error(message || "Không thể hủy giữ chỗ để quay lại chỉnh sửa");
      setReturningToBooking(false);
    }
  };

  // Chỉ phục vụ hiển thị: vòng đếm ngược và trạng thái màu.
  const holdTotalSeconds = 15 * 60;
  const holdProgress = Math.max(0, Math.min(1, timeLeft / holdTotalSeconds));
  const holdExpired = timeLeft <= 0 && !isBalancePayment;
  const holdUrgent = !holdExpired && timeLeft <= 5 * 60;
  const ringRadius = 26;
  const ringLength = 2 * Math.PI * ringRadius;
  const amountLabel = isBalancePayment
    ? isGroupedBooking ? "Phần còn lại của cả lịch" : "Thanh toán phần còn lại (70%)"
    : isGroupedBooking
      ? booking.paymentMethod === "deposit" ? `Cọc 30% cho cả lịch · ${booking.groupSize} buổi` : `Thanh toán 100% cả lịch · ${booking.groupSize} buổi`
      : booking.paymentMethod === "deposit" ? "Số tiền cọc giữ chỗ (30%)" : "Tổng tiền thanh toán 100%";
  const channelTabs = [
    { id: "card" as const, label: "Cổng VNPay", desc: "ATM, Visa/Master, QR-Pay", icon: CreditCard },
    { id: "transfer" as const, label: "Quét mã VietQR", desc: "Chuyển khoản ngân hàng", icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-surface text-stone-700 py-8 px-4 md:py-12">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => setShowBackConfirm(true)}
          className="btn-ghost group mb-6 min-h-11 rounded-xl px-3 text-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> Quay lại đặt sân
        </button>

        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up">
          <div>
            <p className="eyebrow"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Thanh toán bảo mật</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-950 md:text-4xl">Xác nhận thanh toán</h1>
            <p className="mt-2 text-sm text-stone-600">
              Sân đấu: <span className="font-bold text-stone-900">{booking.fieldName} - {booking.court}</span>
            </p>
          </div>

          {/* Đếm ngược giữ chỗ */}
          <div
            className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-soft ${holdExpired ? "border-rose-200" : holdUrgent ? "border-rose-200" : "border-brand-200"}`}
            role="timer"
            aria-live="off"
            aria-label={`Thời gian giữ chỗ còn ${formatTime(timeLeft)}`}
          >
            <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90" aria-hidden="true">
              <circle cx="32" cy="32" r={ringRadius} fill="none" strokeWidth="6" className="stroke-stone-100" />
              <circle
                cx="32" cy="32" r={ringRadius} fill="none" strokeWidth="6" strokeLinecap="round"
                className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${holdExpired || holdUrgent ? "stroke-rose-500" : "stroke-brand-500"}`}
                strokeDasharray={ringLength}
                strokeDashoffset={ringLength * (1 - holdProgress)}
              />
            </svg>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Thời gian giữ chỗ
              </div>
              <div className={`font-mono text-2xl font-black tabular-nums ${holdExpired || holdUrgent ? "text-rose-600" : "text-stone-950"}`}>{formatTime(timeLeft)}</div>
              {holdExpired && <div className="text-xs font-bold text-rose-600">Đã hết hạn giữ chỗ</div>}
            </div>
          </div>
        </header>

        {!bookingDataMismatch && (
          <div className="relative mb-6 flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-brand lg:hidden">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[16px] border-white/10" aria-hidden="true" />
            <div className="relative min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/90">{amountLabel}</span>
              <span className="mt-0.5 block text-3xl font-black tracking-tight tabular-nums">{formatCurrency(amountToPay)}</span>
            </div>
            <ShieldCheck className="relative h-8 w-8 shrink-0 text-white/80" aria-hidden="true" />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Cột trái: kênh thanh toán */}
          <section className="card p-5 sm:p-6 md:p-8 animate-fade-in-up" aria-labelledby="channel-title">
            <h2 id="channel-title" className="text-lg font-extrabold text-stone-950">Chọn kênh thanh toán</h2>
            <p className="mt-1 text-sm text-stone-600">Hệ thống chỉ chuyển sang VNPay sau khi bạn chủ động chọn VNPay và bấm xác nhận.</p>

            {/* Tabs */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {channelTabs.map((item) => {
                const active = tab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={active}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${active
                      ? "border-brand-500 bg-brand-50 shadow-[0_0_0_3px_var(--color-brand-100)]"
                      : "border-stone-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"}`}
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold text-stone-900">{item.label}</span>
                      <span className="block text-xs text-stone-600">{item.desc}</span>
                    </span>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-brand-600" : "border-stone-300"}`} aria-hidden="true">
                      <span className={`h-2.5 w-2.5 rounded-full bg-brand-600 transition-transform ${active ? "scale-100" : "scale-0"}`} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              {!tab && (
                <div role="status" className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-surface p-8 text-center">
                  <CreditCard className="mb-3 h-8 w-8 text-stone-300" aria-hidden="true" />
                  <h3 className="mb-1 font-extrabold text-stone-900">Chưa chọn kênh thanh toán</h3>
                  <p className="text-sm text-stone-600">Chọn VNPay hoặc VietQR ở trên để tiếp tục.</p>
                </div>
              )}

              {/* Tab 1: VNPay */}
              {tab === "card" && (
                <div className="rounded-2xl border border-stone-200 bg-surface p-6 text-center animate-fade-in">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white text-brand-600 shadow-soft ring-1 ring-brand-100">
                    <CreditCard className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-extrabold text-stone-950">Thanh toán tức thì qua VNPay</h3>
                  <p className="mx-auto mb-4 max-w-sm text-sm leading-relaxed text-stone-600">
                    Hỗ trợ thẻ ATM nội địa, Thẻ Visa/Mastercard và ứng dụng ngân hàng quét mã QR-Pay an toàn, bảo mật.
                  </p>
                  <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Bảo mật mã hóa SSL 256-bit
                  </div>
                </div>
              )}

              {/* Tab 2: Chuyển khoản VietQR */}
              {tab === "transfer" && (
                <div className="grid gap-5 animate-fade-in md:grid-cols-[auto_1fr] md:items-start lg:grid-cols-1">
                  <div className="text-center">
                    <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-2xl border-2 border-brand-200 bg-white p-3 shadow-soft">
                      <img
                        src={vietQrUrl}
                        alt="VietQR Chuyển khoản"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <dl className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-surface px-4 text-sm">
                      <div className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-stone-600">Ngân hàng thụ hưởng</dt>
                        <dd className="font-bold uppercase text-stone-900">{BANK_ID} - MBBANK</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-stone-600">Số tài khoản</dt>
                        <dd>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ACCOUNT_NO, "số tài khoản")}
                            className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-bold text-brand-700 transition hover:bg-brand-50"
                            aria-label={`Sao chép số tài khoản ${ACCOUNT_NO}`}
                          >
                            {ACCOUNT_NO} <Copy className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />
                          </button>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-stone-600">Chủ tài khoản</dt>
                        <dd className="text-right font-bold text-stone-900">{ACCOUNT_NAME}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-stone-600">Nội dung</dt>
                        <dd>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(addInfo, "nội dung")}
                            className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-mono font-bold text-brand-700 transition hover:bg-brand-50"
                            aria-label={`Sao chép nội dung ${addInfo}`}
                          >
                            {addInfo} <Copy className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />
                          </button>
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs font-medium text-stone-600">
                      Mở ứng dụng ngân hàng, quét đúng mã và giữ nguyên nội dung chuyển khoản.
                    </p>
                    {import.meta.env.DEV && (
                      <button
                        type="button"
                        onClick={handleConfirmPayment}
                        disabled={loading || bookingDataMismatch}
                        className="btn-outline mt-4 min-h-11 rounded-xl px-5 text-xs disabled:opacity-50"
                      >
                        {loading ? "Đang tạo đơn demo..." : "Xác nhận giao dịch demo"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6">
              {tab === "card" ? (
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={loading || bookingDataMismatch}
                  className="btn-primary w-full min-h-14 rounded-xl text-base disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
                  Chuyển tới cổng thanh toán VNPay
                </button>
              ) : tab === "transfer" ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-center" role="status">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" aria-hidden="true" />
                  <p className="text-sm font-semibold text-brand-900">
                    Hệ thống đang tự động lắng nghe giao dịch chuyển khoản...
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-primary w-full min-h-14 rounded-xl text-base opacity-50"
                >
                  Chọn kênh thanh toán để tiếp tục
                </button>
              )}
            </div>
          </section>

          {/* Cột phải: tóm tắt số tiền & lịch */}
          <aside className="space-y-4 lg:sticky lg:top-28" aria-label="Tóm tắt thanh toán">
            {bookingDataMismatch ? (
              <div role="alert" className="card border-rose-200 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <p className="font-extrabold text-rose-800">Thông tin booking chưa khớp</p>
                    <p className="mt-1 text-sm leading-6 text-rose-800/90">
                      Form có {requestedSessionCount} buổi, tổng {formatCurrency(requestedTotal)}; hệ thống lưu {savedSessionCount} buổi, tổng {formatCurrency(bookingTotal)}. Hãy quay lại tạo booking để không thanh toán thiếu.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-brand animate-fade-in-up lg:block">
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[22px] border-white/10" aria-hidden="true" />
                <span className="relative block text-xs font-bold uppercase tracking-wider text-white/90">{amountLabel}</span>
                <span className="relative mt-1 block text-4xl font-black tracking-tight tabular-nums">
                  {formatCurrency(amountToPay)}
                </span>
                <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Giao dịch được mã hoá
                </span>
              </div>
            )}

            {isGroupedBooking && (
              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Thanh toán gộp · cả lịch dài hạn</span>
                  <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-black text-white">{booking.groupSize} buổi</span>
                </div>
                {groupSchedule.length > 0 && (
                  <div className="mt-3 max-h-36 space-y-1.5 overflow-y-auto pr-1 text-xs text-stone-700">
                    {groupSchedule.map((session, index) => (
                      <div key={`${session.date}|${session.time}|${index}`} className="flex justify-between gap-3 rounded-lg bg-surface px-3 py-2 ring-1 ring-stone-200">
                        <span>Buổi {index + 1} · {session.date} · {session.time}</span>
                        <span className="shrink-0 text-stone-500">{session.duration || booking.duration || 1}h</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs leading-5 text-stone-600">Một giao dịch này thanh toán cho toàn bộ các buổi đang hiển thị, không thu riêng từng booking con.</p>
              </div>
            )}

            {paymentSchedule.length > 0 && (
              <section className="card p-5" aria-label="Lịch sân trong đơn thanh toán">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-stone-950">Lịch sân sẽ thanh toán</h3>
                  <span className="chip">{paymentSchedule.length} buổi</span>
                </div>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {paymentSchedule.map((session: { date: string; time: string }, index: number) => (
                    <div key={session.date + "|" + session.time} className="flex items-center justify-between rounded-xl border border-stone-200 bg-surface px-3 py-2.5 text-sm">
                      <span className="font-semibold text-stone-600">Buổi {index + 1}</span>
                      <span className="font-bold tabular-nums text-stone-900">{session.date.split("-").reverse().join("/")} · {session.time}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <ul className="space-y-2.5 px-1 text-xs text-stone-600">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> Không lưu thông tin thẻ trên hệ thống</li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" /> Chỗ được giữ trong thời gian đếm ngược</li>
            </ul>
          </aside>
        </div>
      </div>
      {showBackConfirm && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="back-to-booking-title">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-lift animate-scale-in">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 id="back-to-booking-title" className="text-xl font-extrabold text-stone-950">
                  Quay lại chỉnh sửa đặt sân?
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Đơn giữ chỗ hiện tại sẽ được hủy và khung giờ được nhả ra. Thông tin đã nhập vẫn được giữ để bạn chỉnh sửa và đặt lại.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowBackConfirm(false)}
                disabled={returningToBooking}
                className="btn-outline min-h-12 flex-1 rounded-xl px-4 text-sm disabled:opacity-50"
              >
                Tiếp tục thanh toán
              </button>
              <button
                type="button"
                onClick={handleReturnToBooking}
                disabled={returningToBooking}
                className="btn-primary min-h-12 flex-1 rounded-xl px-4 text-sm disabled:opacity-50"
              >
                {returningToBooking ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Hủy đơn và quay lại"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
