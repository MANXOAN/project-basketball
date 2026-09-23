import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, CalendarDays, Clock, MapPin, CheckCircle, XCircle, AlertCircle, RefreshCw, QrCode, FileText, Phone, Navigation } from "lucide-react";
import { api, Booking, formatCurrency } from "../lib/api";
import { getUser } from "../lib/auth";
import toast from "react-hot-toast";
import BookingPass from "../components/BookingPass";
import { createDemoBookings } from "../data/demoData";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode; dot: string }> = {
  pending: {
    label: "Chờ xác nhận",
    className: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    dot: "bg-amber-400 shadow-sm shadow-amber-400/50",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    dot: "bg-emerald-400 shadow-sm shadow-emerald-400/50",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    icon: <XCircle className="w-3.5 h-3.5" />,
    dot: "bg-rose-500",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    dot: "bg-yellow-400",
  },
};

function getBookingStartMs(booking: Booking) {
  const date = String(booking.date || "");
  const time = String(booking.time || "00:00");
  const [first, second, third] = date.split(/[/-]/).map(Number);
  const normalizedDate = first > 999
    ? date
    : Number.isFinite(third) && Number.isFinite(first) && Number.isFinite(second)
      ? `${third}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`
      : date;
  return new Date(`${normalizedDate}T${time}:00`).getTime();
}

type BookingDetail = Booking & {
  field?: {
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    openTime?: string;
    closeTime?: string;
  } | null;
  courtDetail?: { name: string; type?: string; capacity?: number } | null;
};

type RefundNotification = {
  id: number;
  bookingId: number;
  type: "refund_completed";
  title: string;
  message: string;
  readAt?: string | null;
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useMemo(() => getUser(), []);

  const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: 0, stk: "", bank: "", needsRefund: false });
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; code: string | null; booking?: Booking | null }>({
    isOpen: false,
    code: null,
    booking: null,
  });
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; loading: boolean; detail?: BookingDetail | null }>({
    isOpen: false,
    loading: false,
    detail: null,
  });

  const load = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<Booking[]>("/bookings");
      const userId = String(user.id);
      const userEmail = user.email?.trim().toLowerCase();
      const userPhone = user.phone?.replace(/\D/g, "");
      const userName = user.fullName?.trim().toLowerCase();
      const phoneMatches = (bookingPhone?: string) => {
        if (!userPhone || !bookingPhone) return false;
        const normalizedBookingPhone = bookingPhone.replace(/\D/g, "");
        if (normalizedBookingPhone === userPhone) return true;
        const localUserPhone = userPhone.startsWith("84") ? `0${userPhone.slice(2)}` : userPhone;
        const localBookingPhone = normalizedBookingPhone.startsWith("84")
          ? `0${normalizedBookingPhone.slice(2)}`
          : normalizedBookingPhone;
        return localUserPhone === localBookingPhone || localUserPhone.slice(-9) === localBookingPhone.slice(-9);
      };
      const mine = res.data
        .filter(
          (b) => {
            const bookingUserId = b.customer?.userId == null ? "" : String(b.customer.userId);
            const bookingEmail = (b.customer?.email || (b.customer as { userEmail?: string })?.userEmail)?.trim().toLowerCase();
            const bookingPhone = b.customer?.phone;
            const bookingName = b.customer?.fullName?.trim().toLowerCase();
            const bookingNestedUserId = (b.customer as { user?: { id?: number | string } })?.user?.id;

            return (
              (Boolean(userId) && (bookingUserId === userId || String(bookingNestedUserId ?? "") === userId)) ||
              (Boolean(userEmail) && bookingEmail === userEmail) ||
              phoneMatches(bookingPhone) ||
              (Boolean(userName) && bookingName === userName)
            );
          }
        )
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setBookings(mine.length ? mine : createDemoBookings({
        fullName: user.fullName || "Khách hàng GoldenState",
        phone: user.phone || "0900000000",
        email: user.email,
        userId: Number(user.id),
      }));
    } catch {
      toast.error("Không tải được đơn đặt sân");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Không dùng socket: hỏi API thông báo định kỳ để đơn đang mở vẫn đổi sang
  // "Đã hoàn tiền" sau khi admin xác nhận, không cần khách F5.
  useEffect(() => {
    if (!user) return;
    let active = true;
    const checkRefundNotifications = async () => {
      try {
        const response = await api.get<RefundNotification[]>("/notifications");
        const unread = response.data.filter((notification) =>
          notification.type === "refund_completed" && !notification.readAt
        );
        if (!unread.length) return;
        await Promise.all(unread.map((notification) => api.patch(`/notifications/${notification.id}/read`)));
        if (!active) return;
        unread.forEach((notification) => toast.success(notification.message, { duration: 6000 }));
        load();
      } catch {
        // Khách chưa đăng nhập hoặc mất mạng: không hiển thị lỗi lặp lại.
      }
    };
    checkRefundNotifications();
    const interval = window.setInterval(checkRefundNotifications, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user, load]);

  const openCancelModal = (booking: Booking) => {
    const needsRefund = booking.paymentStatus === "paid" || booking.paymentStatus === "deposit_paid";
    if (needsRefund && getBookingStartMs(booking) - Date.now() < 2 * 60 * 60 * 1000) {
      toast.error("Đơn đã thanh toán chỉ được hủy trước giờ bắt đầu ít nhất 2 tiếng");
      return;
    }
    setCancelModal({ isOpen: true, bookingId: booking.id, stk: "", bank: "", needsRefund });
  };

  const submitCancel = async () => {
    if (cancelModal.needsRefund && (!cancelModal.stk || !cancelModal.bank)) {
      toast.error("Vui lòng nhập Số tài khoản và Ngân hàng để hoàn tiền");
      return;
    }
    try {
      const response = await api.post<Booking>(`/bookings/${cancelModal.bookingId}/cancel`, {
        refundStk: cancelModal.stk,
        refundBank: cancelModal.bank,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelModal.bookingId ? response.data : b))
      );
      toast.success(cancelModal.needsRefund ? "Đã hủy đơn, yêu cầu hoàn tiền đang được xử lý" : "Đã hủy đơn và nhả lại khung giờ");
      setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "", needsRefund: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Hủy thất bại");
    }
  };

  const payBalance = (booking: Booking) => {
    navigate("/paygate", { state: { balanceBooking: booking } });
  };

  const resumePayment = (booking: Booking) => {
    navigate("/paygate", { state: { booking } });
  };

  const openBookingDetail = async (booking: Booking) => {
    setDetailModal({ isOpen: true, loading: true, detail: booking });
    try {
      const response = await api.get<BookingDetail>(`/bookings/${booking.id}/detail`);
      setDetailModal({ isOpen: true, loading: false, detail: response.data });
    } catch {
      setDetailModal({ isOpen: true, loading: false, detail: booking });
      toast.error("Không tải được toàn bộ chi tiết đơn");
    }
  };

  const extendOneHour = async (b: Booking) => {
    if (!confirm("Bạn có muốn gia hạn thuê thêm 1 giờ ngay sau khung hiện tại?")) return;
    try {
      const [h, m] = b.time.split(":").map(Number);
      const startMin = h * 60 + m + (b.duration || 1) * 60;
      const nh = Math.floor(startMin / 60) % 24;
      const nm = startMin % 60;
      const newTime = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
      const pricePerHour = b.duration ? Math.round(b.total / b.duration) : b.total;

      await api.post("/bookings", {
        fieldId: b.fieldId,
        courtId: b.courtId,
        fieldName: b.fieldName,
        court: b.court,
        date: b.date,
        time: newTime,
        duration: 1,
        total: pricePerHour,
        customer: b.customer,
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      toast.success(`Đã đặt thêm 1 giờ (${newTime}). Vui lòng kiểm tra danh sách!`);
      load();
    } catch {
      toast.error("Không thể gia hạn thêm giờ");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-3 bg-[#f7f8f6] min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
        <p className="text-gray-400 text-sm font-medium">Đang tải lịch sử đơn của bạn...</p>
      </div>
    );
  }

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-700 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 mb-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-3xl shadow-inner text-yellow-400 font-black">
                {(user?.fullName || user?.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-yellow-400" />
                  Đơn Đặt Sân Của Tôi
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Khách hàng: <strong className="text-slate-900">{user?.fullName || user?.email}</strong>
                </p>
              </div>
            </div>

            <Link
              to="/fields"
              className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm whitespace-nowrap"
            >
              + Đặt sân mới
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {[
              { label: "Tổng đơn đặt", value: stats.total, color: "text-slate-950", border: "border-slate-200" },
              { label: "Đã xác nhận", value: stats.confirmed, color: "text-emerald-400", border: "border-emerald-500/20" },
              { label: "Chờ xác nhận", value: stats.pending, color: "text-amber-400", border: "border-amber-500/20" },
              { label: "Đã hủy", value: stats.cancelled, color: "text-rose-400", border: "border-rose-500/20" },
            ].map((s) => (
              <div key={s.label} className={`bg-slate-50 rounded-2xl p-4 text-center border ${s.border}`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="text-6xl mb-4 opacity-70">🏀</div>
            <h3 className="text-xl font-bold text-slate-950 mb-2">Bạn chưa có đơn đặt sân nào</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Hãy chọn sân đấu yêu thích và tận hưởng những giờ phút thi đấu bùng nổ cùng đồng đội!
            </p>
            <Link to="/fields" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm">
              Khám phá sân bóng ngay →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              const bookingCode = `BK${String(b.id).padStart(6, "0")}`;
              const isPaidBooking = b.paymentStatus === "paid" || b.paymentStatus === "deposit_paid";
              const cancellationDeadlinePassed = isPaidBooking && getBookingStartMs(b) - Date.now() < 2 * 60 * 60 * 1000;
              const canCancel = (b.status === "pending" || b.status === "confirmed") && !cancellationDeadlinePassed;
              const canResumePayment = b.status === "pending" && b.paymentStatus === "unpaid" &&
                (!b.paymentExpiresAt || new Date(b.paymentExpiresAt).getTime() > Date.now());

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-amber-300 transition-all shadow-sm group"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-100 gap-3 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                      <span className="font-mono font-bold text-slate-900 text-base">{bookingCode}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${st.className}`}>
                        {st.icon}
                        {st.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      Tạo lúc: {b.createdAt ? new Date(b.createdAt).toLocaleString("vi-VN") : "Gần đây"}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                        <div>
                          <div className="font-extrabold text-slate-900 text-base">{b.fieldName}</div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">Sân thi đấu: <span className="text-amber-600 font-bold">{b.court}</span></div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                        <div>
                          <div className="font-extrabold text-slate-900 text-base">
                            {b.time} ({b.duration || 1} giờ)
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">
                            Ngày: <span className="text-slate-900 font-bold">{b.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {b.status === "cancelled" && (
                      <div
                        className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                          b.refundStatus === "completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : b.refundStatus === "pending"
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                        role="status"
                      >
                        {b.refundStatus === "pending" && (
                          <><strong>Đang hoàn tiền {formatCurrency(b.refundAmount || 0)}.</strong> Yêu cầu đã được gửi tới quản trị viên.</>
                        )}
                        {b.refundStatus === "completed" && (
                          <><strong>Đã hoàn tiền {formatCurrency(b.refundAmount || 0)}.</strong> Ngân hàng: {b.refundBank || "—"} · STK: {b.refundStk || "—"}</>
                        )}
                        {(!b.refundStatus || b.refundStatus === "none") && (
                          <><strong>Đã hủy đơn.</strong> Đơn chưa phát sinh thanh toán nên không cần hoàn tiền.</>
                        )}
                      </div>
                    )}

                    {/* Price and Details */}
                    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-4">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Tổng tiền</div>
                        <div className="text-xl font-black text-amber-600">
                          {formatCurrency(b.total)}
                          {b.paymentMethod === "deposit" && b.paymentStatus === "deposit_paid" && (
                            <span className="text-xs text-gray-400 font-normal ml-2">(Đã cọc 30% · còn {formatCurrency(Math.max(0, b.total - (b.paidAmount || Math.round(b.total * 0.3))))})</span>
                          )}
                          {b.paymentMethod === "deposit" && b.paymentStatus === "unpaid" && (
                            <span className="text-xs text-rose-500 font-normal ml-2">(Chưa thanh toán tiền cọc)</span>
                          )}
                          {b.paymentMethod === "cash" && (
                            <span className="text-xs text-gray-400 font-normal ml-2">(Tiền mặt tại sân)</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openBookingDetail(b)}
                          className="border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50 rounded-xl flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          Xem chi tiết
                        </button>

                        {b.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => setQrModal({ isOpen: true, code: bookingCode, booking: b })}
                          className="bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white border border-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Mã QR Check-in
                        </button>
                        )}

                        {b.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => extendOneHour(b)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
                            Thuê thêm 1h
                          </button>
                        )}

                        {canResumePayment && (
                          <button
                            type="button"
                            onClick={() => resumePayment(b)}
                            className="bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white border border-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                          >
                            Thanh toán ngay
                          </button>
                        )}

                        {b.status === "confirmed" && b.paymentStatus === "deposit_paid" && (
                          <button
                            type="button"
                            onClick={() => payBalance(b)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                          >
                            Thanh toán 70% còn lại
                          </button>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(b)}
                            className="text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                          >
                            Hủy đơn
                          </button>
                        )}
                        {(b.status === "pending" || b.status === "confirmed") && cancellationDeadlinePassed && (
                          <span className="text-xs font-semibold text-slate-500" role="status">
                            Đã quá hạn hủy (cần trước giờ sân 2 tiếng)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR Check-in Modal */}
        {qrModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Vé check-in điện tử">
            <div className="w-full max-w-2xl py-8">
              {qrModal.booking && <BookingPass booking={qrModal.booking} code={qrModal.code || undefined} />}
              <button
                type="button"
                onClick={() => setQrModal({ isOpen: false, code: null, booking: null })}
                className="btn-outline mt-4 min-h-11 w-full rounded-xl py-3 text-sm font-bold"
              >
                Đóng vé điện tử
              </button>
            </div>
          </div>
        )}

        {/* Booking Detail Modal */}
        {detailModal.isOpen && detailModal.detail && (() => {
          const detail = detailModal.detail;
          const address = [detail.field?.address, detail.field?.city].filter(Boolean).join(", ");
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Chi tiết đơn đặt sân">
              <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 px-6 py-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Chi tiết đơn đặt sân</p>
                      <h2 className="mt-2 font-mono text-2xl font-black">BK{String(detail.id).padStart(6, "0")}</h2>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
                      {statusConfig[detail.status]?.label || "Chờ xác nhận"}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4 text-sm text-slate-200">
                    <CalendarDays className="h-4 w-4 text-amber-300" />
                    <span>{detail.date} · <strong className="text-white">{detail.time} – {detail.duration || 1} giờ</strong></span>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  {detailModal.loading ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /> Đang tải thông tin sân...</div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                          <div>
                            <div className="font-black text-slate-950">{detail.field?.name || detail.fieldName}</div>
                            <div className="mt-1 text-sm font-semibold text-amber-700">{detail.courtDetail?.name || detail.court}</div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{address || "Địa chỉ sân đang được cập nhật"}</p>
                          </div>
                        </div>
                        {address && (
                          <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 underline decoration-amber-400 decoration-2 underline-offset-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
                            <Navigation className="h-3.5 w-3.5" /> Mở chỉ đường
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Thời gian</div><div className="mt-1 font-black text-slate-900">{detail.time}</div><div className="mt-1 text-xs text-slate-500">{detail.duration || 1} giờ thuê</div></div>
                        <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng thanh toán</div><div className="mt-1 font-black text-amber-600">{formatCurrency(detail.total)}</div><div className="mt-1 text-xs text-slate-500">{detail.paymentStatus === "unpaid" ? "Chưa thanh toán" : "Đã ghi nhận thanh toán"}</div></div>
                      </div>

                      {detail.field?.phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-amber-600" /> Liên hệ sân: <a className="font-bold text-slate-950" href={`tel:${detail.field.phone}`}>{detail.field.phone}</a></div>}
                    </>
                  )}
                  <button type="button" onClick={() => setDetailModal({ isOpen: false, loading: false, detail: null })} className="min-h-11 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-amber-500 hover:text-slate-950">Đóng</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cancel Refund Modal */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-md w-full shadow-xl relative">
              <h3 className="text-xl font-black text-slate-950 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                Hủy Đơn & Yêu Cầu Hoàn Tiền
              </h3>
              <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                {cancelModal.needsRefund ? "Bạn được hoàn khoản tiền đã thanh toán nếu hủy trước giờ bắt đầu ít nhất 2 tiếng. Trạng thái hoàn tiền sẽ hiển thị trong đơn của bạn." : "Đơn chưa thanh toán sẽ được hủy ngay và nhả lại khung giờ."}
              </p>

              {cancelModal.needsRefund && <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tên ngân hàng thụ hưởng *
                  </label>
                  <input
                    placeholder="VD: Vietcombank, MBBank, Techcombank..."
                    value={cancelModal.bank}
                    onChange={(e) => setCancelModal({ ...cancelModal, bank: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Số tài khoản nhận hoàn tiền *
                  </label>
                  <input
                    placeholder="Nhập chính xác STK ngân hàng..."
                    value={cancelModal.stk}
                    onChange={(e) => setCancelModal({ ...cancelModal, stk: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none font-mono"
                  />
                </div>
              </div>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "", needsRefund: false })}
                  className="flex-1 btn-outline py-3 rounded-xl text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={submitCancel}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  Xác nhận hủy đơn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
