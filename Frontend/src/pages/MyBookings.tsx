import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, CreditCard, MapPin, CheckCircle, XCircle, AlertCircle, Info, Plus, RefreshCw, Repeat, QrCode, FileText, Phone, Navigation, Pencil, History, Timer, X } from "lucide-react";
import { api, Booking, formatCurrency, type Court, type Field } from "../lib/api";
import { getUser } from "../lib/auth";
import toast from "react-hot-toast";
import BookingPass from "../components/BookingPass";
import BookingRescheduleModal from "../components/BookingRescheduleModal";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode; dot: string }> = {
  pending: {
    label: "Chờ xác nhận",
    className: "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200",
    icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    dot: "bg-brand-500 ring-4 ring-brand-100",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    icon: <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    dot: "bg-emerald-500 ring-4 ring-emerald-100",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    dot: "bg-rose-500 ring-4 ring-rose-100",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-200",
    icon: <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />,
    dot: "bg-stone-400 ring-4 ring-stone-100",
  },
};

function StatusChip({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const st = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold ${size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"} ${st.className}`}>
      {st.icon}
      {st.label}
    </span>
  );
}

const historyLabels: Record<BookingHistoryEntry["changeType"], string> = { create: "Tạo buổi", update: "Cập nhật", cancel: "Hủy buổi", reschedule: "Đổi lịch", refund: "Hoàn tiền", payment: "Thanh toán" };

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

function newestBookingFirst(a: Booking, b: Booking) {
  const aCreatedAt = Date.parse(a.createdAt || "");
  const bCreatedAt = Date.parse(b.createdAt || "");
  if (Number.isFinite(aCreatedAt) && Number.isFinite(bCreatedAt) && aCreatedAt !== bCreatedAt) return bCreatedAt - aCreatedAt;
  return Number(b.id) - Number(a.id);
}

// Buổi đã chuyển khoản thành công (cọc hoặc 100%) thì khách không tự đổi/hủy được nữa.
function isTransferPaid(booking: Booking) {
  return booking.paymentStatus === "deposit_paid" || booking.paymentStatus === "paid";
}

function canModifySession(booking: Booking) {
  return ["pending", "confirmed"].includes(booking.status) && !isTransferPaid(booking);
}

function customerRefundPreview(booking: Booking) {
  const paidAmount = Number(booking.paidAmount) > 0
    ? Number(booking.paidAmount)
    : booking.paymentStatus === "deposit_paid"
      ? Math.round(Number(booking.total) * 0.3)
      : booking.paymentStatus === "paid"
        ? Number(booking.total)
        : 0;
  const timeUntilStart = getBookingStartMs(booking) - Date.now();
  const refundRate = paidAmount <= 0 ? 0 : timeUntilStart >= 2 * 60 * 60 * 1000 ? 100 : timeUntilStart > 0 ? 50 : 0;
  return { paidAmount, refundRate, refundAmount: Math.round(paidAmount * refundRate / 100) };
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
  reservedCourts?: Array<{ id: number; name: string; type?: string; capacity?: number; price?: number }>;
  groupSchedule?: Array<{
    id: number;
    date: string;
    time: string;
    duration: number;
    total: number;
    status: string;
    paymentStatus: string;
  }>;
  history?: BookingHistoryEntry[];
};

type BookingHistoryEntry = {
  _id?: string;
  changeType: "create" | "update" | "cancel" | "reschedule" | "refund" | "payment";
  changedAt: string;
  reason?: string;
  paymentDelta?: number;
  fieldBefore?: Record<string, unknown> | null;
  fieldAfter?: Record<string, unknown> | null;
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

  const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: 0, stk: "", bank: "", paidAmount: 0, refundRate: 0, refundAmount: 0 });
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; code: string | null; booking?: Booking | null; sessions?: Booking[]; selectedSession?: Booking | null }>({
    isOpen: false,
    code: null,
    booking: null,
  });
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; loading: boolean; detail?: BookingDetail | null }>({
    isOpen: false,
    loading: false,
    detail: null,
  });
  const [rescheduleModal, setRescheduleModal] = useState<{
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
  }>({
    isOpen: false, booking: null, fields: [], courts: [], fieldId: 0, courtId: 0,
    date: "", time: "", duration: 1, reason: "", submitting: false, error: "",
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
        .sort(newestBookingFirst);
      setBookings(mine);
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
    const preview = customerRefundPreview(booking);
    setCancelModal({
      isOpen: true,
      bookingId: booking.id,
      stk: "",
      bank: "",
      paidAmount: preview.paidAmount,
      refundRate: preview.refundRate,
      refundAmount: preview.refundAmount,
    });
  };

  const submitCancel = async () => {
    if (cancelModal.refundAmount > 0 && (!cancelModal.stk || !cancelModal.bank)) {
      toast.error("Vui lòng nhập Số tài khoản và Ngân hàng để hoàn tiền");
      return;
    }
    try {
      const response = await api.post<Booking & { cancelledBookingIds?: number[] }>("/bookings/" + cancelModal.bookingId + "/cancel", {
        refundStk: cancelModal.stk,
        refundBank: cancelModal.bank,
      });
      const cancelledIds = new Set(response.data.cancelledBookingIds || [cancelModal.bookingId]);
      setBookings((prev) => prev.map((booking) => cancelledIds.has(booking.id)
        ? {
          ...booking,
          status: "cancelled",
          refundAmount: response.data.refundAmount,
          refundRate: response.data.refundRate,
          refundStatus: response.data.refundStatus,
          refundReason: response.data.refundReason,
          refundBank: response.data.refundBank,
          refundStk: response.data.refundStk,
        }
        : booking));
      toast.success(
        Number(response.data.refundAmount || 0) > 0
          ? "Đã hủy đơn, yêu cầu hoàn " + response.data.refundRate + "% đang được xử lý"
          : "Đã hủy đơn và nhả lại khung giờ; trường hợp này không phát sinh hoàn tiền"
      );
      setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "", paidAmount: 0, refundRate: 0, refundAmount: 0 });
      await load();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Hủy thất bại");
    }
  };

  const openPayment = async (booking: Booking, balance = false) => {
    try {
      const response = await api.get<BookingDetail>("/bookings/" + booking.id + "/detail");
      navigate("/paygate", { state: balance ? { balanceBooking: response.data } : { booking: response.data } });
    } catch {
      navigate("/paygate", { state: balance ? { balanceBooking: booking } : { booking } });
    }
  };

  const payBalance = (booking: Booking) => void openPayment(booking, true);
  const resumePayment = (booking: Booking) => void openPayment(booking);

  const openReschedule = async (booking: Booking) => {
    setRescheduleModal({ isOpen: true, booking, fields: [], courts: [], fieldId: booking.fieldId, courtId: booking.courtId, date: booking.date, time: booking.time, duration: booking.duration || 1, reason: "", submitting: false, error: "" });
    try {
      const [fieldResponse, courtResponse] = await Promise.all([api.get<Field[]>("/fields"), api.get<Court[]>("/courts")]);
      setRescheduleModal((current) => ({ ...current, fields: fieldResponse.data, courts: courtResponse.data }));
    } catch {
      setRescheduleModal((current) => ({ ...current, error: "Không tải được danh sách sân. Vui lòng đóng và thử lại." }));
    }
  };

  const submitReschedule = async (event: React.FormEvent) => {
    event.preventDefault();
    const booking = rescheduleModal.booking;
    if (!booking?.bookingGroupId) return;
    setRescheduleModal((current) => ({ ...current, submitting: true, error: "" }));
    try {
      const response = await api.patch("/booking-groups/" + booking.bookingGroupId + "/children/" + booking.id, {
        newFieldId: rescheduleModal.fieldId, newCourtId: rescheduleModal.courtId, newDate: rescheduleModal.date,
        newTime: rescheduleModal.time, newDuration: rescheduleModal.duration, reason: rescheduleModal.reason,
      });
      if (response.data.status === "requires_payment") {
        const adjustment = response.data.adjustment;
        const paymentResponse = await api.post("/vnpay/create-url", {
          orderId: String(booking.id), amount: adjustment.paymentDelta, paymentKind: "adjustment", adjustmentId: adjustment.id, language: "vn",
        });
        window.location.href = paymentResponse.data.paymentUrl;
        return;
      }
      toast.success(response.data.message || "Đổi lịch thành công");
      setRescheduleModal((current) => ({ ...current, isOpen: false, submitting: false }));
      await load();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Đổi lịch thất bại, đơn cũ đã được giữ nguyên";
      setRescheduleModal((current) => ({ ...current, submitting: false, error: message }));
    }
  };

  const openTicket = async (booking: Booking, sessions?: Booking[]) => {
    const code = sessions && sessions.length > 1 ? "LG" + String(booking.id).padStart(6, "0") : "BK" + String(booking.id).padStart(6, "0");
    setQrModal({ isOpen: true, code, booking, sessions, selectedSession: null });
    try {
      const response = await api.get<BookingDetail>("/bookings/" + booking.id + "/detail");
      setQrModal({ isOpen: true, code, booking: response.data, sessions, selectedSession: null });
    } catch {
      toast.error("Chưa tải được địa chỉ chi tiết; vé vẫn có thể sử dụng.");
    }
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

  const extendOneHour = async (booking: Booking) => {
    if (!booking.bookingGroupId || !confirm("Bạn có muốn tăng thời lượng buổi này thêm 1 giờ? Hệ thống sẽ kiểm tra trùng lịch và tính phụ thu nếu có.")) return;
    try {
      const response = await api.patch("/booking-groups/" + booking.bookingGroupId + "/children/" + booking.id, {
        newFieldId: booking.fieldId,
        newCourtId: booking.courtId,
        newDate: booking.date,
        newTime: booking.time,
        newDuration: Number(booking.duration || 1) + 1,
        reason: "customer_extend_one_hour",
      });
      if (response.data.status === "requires_payment") {
        const adjustment = response.data.adjustment;
        const paymentResponse = await api.post("/vnpay/create-url", {
          orderId: String(booking.id), amount: adjustment.paymentDelta, paymentKind: "adjustment", adjustmentId: adjustment.id, language: "vn",
        });
        window.location.href = paymentResponse.data.paymentUrl;
        return;
      }
      toast.success(response.data.message || "Đã gia hạn buổi này thêm 1 giờ");
      await load();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Không thể gia hạn: khung giờ tiếp theo có thể đã được đặt");
    }
  };
  const bookingCards = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    bookings.forEach((booking) => {
      const key = booking.bookingGroupId || `booking-${booking.id}`;
      const sessions = grouped.get(key) || [];
      sessions.push(booking);
      grouped.set(key, sessions);
    });
    return [...grouped.entries()].map(([key, sessions]) => ({
      key,
      sessions: sessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id - b.id),
    })).sort((a, b) => newestBookingFirst(a.sessions[0], b.sessions[0]));
  }, [bookings]);


  if (loading) {
    return (
      <div className="min-h-screen bg-surface px-4 pb-16 pt-8 sm:pt-12" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-5xl">
          <span className="sr-only">Đang tải lịch sử đơn của bạn...</span>
          <div className="skeleton mb-6 h-44 rounded-3xl" />
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card space-y-4 p-6">
                <div className="skeleton h-5 w-48" />
                <div className="grid gap-3 sm:grid-cols-2"><div className="skeleton h-16" /><div className="skeleton h-16" /></div>
                <div className="skeleton h-10 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const actionBase = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold transition";
  const overlay = "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/55 p-4 backdrop-blur-sm animate-fade-in sm:items-center";

  return (
    <div className="min-h-screen bg-surface px-4 pb-16 pt-8 text-stone-700 sm:pt-12">
      <div className="mx-auto max-w-5xl">
        {/* Page Header */}
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-6 text-white shadow-brand sm:p-8 animate-fade-in-up">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-400/40 blur-3xl" aria-hidden="true" />
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-20 right-4 h-64 w-64 text-white/10" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <circle cx="100" cy="100" r="90" />
            <path d="M10 100h180M100 10v180" />
            <path d="M36 36c22 18 33 40 33 64s-11 46-33 64M164 36c-22 18-33 40-33 64s11 46 33 64" />
          </svg>

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-extrabold text-brand-700 shadow-lg shadow-brand-900/20 sm:h-16 sm:w-16">
                {(user?.fullName || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">Lịch sử đặt sân</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Đơn đặt sân của tôi</h1>
                <p className="mt-1 truncate text-sm text-white/90">
                  Khách hàng: <strong className="font-bold text-white">{user?.fullName || user?.email}</strong>
                </p>
              </div>
            </div>

            <Link
              to="/fields"
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 shadow-lg shadow-brand-900/20 transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Đặt sân mới
            </Link>
          </div>
        </section>

        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tổng đơn đặt", value: stats.total, color: "text-stone-950", icon: CalendarDays, iconClass: "bg-stone-100 text-stone-600" },
            { label: "Đã xác nhận", value: stats.confirmed, color: "text-emerald-700", icon: CheckCircle, iconClass: "bg-emerald-50 text-emerald-600" },
            { label: "Chờ xác nhận", value: stats.pending, color: "text-brand-700", icon: AlertCircle, iconClass: "bg-brand-50 text-brand-600" },
            { label: "Đã hủy", value: stats.cancelled, color: "text-rose-700", icon: XCircle, iconClass: "bg-rose-50 text-rose-600" },
          ].map((s, i) => (
            <div key={s.label} className="card flex items-center gap-3 !rounded-2xl p-4" data-reveal style={{ "--reveal-index": i } as React.CSSProperties}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.iconClass}`}>
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className={`text-2xl font-extrabold leading-none tabular-nums ${s.color}`}>{s.value}</div>
                <div className="mt-1 truncate text-xs font-semibold text-stone-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="card brand-grid px-6 py-16 text-center" data-reveal>
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
              <CalendarDays className="h-9 w-9" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-xl font-extrabold text-stone-950">Bạn chưa có đơn đặt sân nào</h3>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-stone-600">
              Hãy chọn sân đấu yêu thích và tận hưởng những giờ phút thi đấu bùng nổ cùng đồng đội!
            </p>
            <Link to="/fields" className="btn-primary min-h-11 rounded-xl px-6 py-3 text-sm">
              Khám phá sân bóng ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {bookingCards.map(({ key, sessions }, cardIndex) => {
              const b = sessions.find((session) => session.status !== "cancelled") || sessions[0];
              const st = statusConfig[b.status] || statusConfig.pending;
              const bookingCode = `BK${String(b.id).padStart(6, "0")}`;
              const canCancel = canModifySession(b);
              const canResumePayment = b.status === "pending" && b.paymentStatus === "unpaid" &&
                (!b.paymentExpiresAt || new Date(b.paymentExpiresAt).getTime() > Date.now());

              return (
                <article
                  key={key}
                  className={`card overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-brand-200 hover:shadow-lift`}
                  data-reveal
                  style={{ "--reveal-index": Math.min(cardIndex, 4) } as React.CSSProperties}
                >
                  {/* Card Header */}
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} aria-hidden="true" />
                      <span className="font-mono text-base font-bold tracking-tight text-stone-950">{bookingCode}</span>
                      <StatusChip status={b.status} />
                      {sessions.length > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 ring-1 ring-inset ring-stone-200">
                          <Repeat className="h-3 w-3" aria-hidden="true" /> Lịch dài hạn · {sessions.length} buổi
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-stone-500">
                      Tạo lúc: {b.createdAt ? new Date(b.createdAt).toLocaleString("vi-VN") : "Gần đây"}
                    </span>
                  </header>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6">
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-stone-200">
                          <MapPin className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-base font-extrabold text-stone-950">{b.fieldName}</div>
                          <div className="mt-0.5 text-sm text-stone-600">Sân thi đấu: <span className="font-bold text-brand-700">{b.court}</span></div>
                          {b.bookingMode === "full_field" && (
                            <span className="chip mt-2 !text-[11px] uppercase tracking-wide">
                              Bao toàn bộ sân · {b.reservedCourtIds?.length || 0} sân con
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-stone-200">
                          <Clock className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <div className="text-base font-extrabold text-stone-950">
                            {b.time} <span className="font-semibold text-stone-500">· {b.duration || 1} giờ</span>
                          </div>
                          <div className="mt-0.5 text-sm text-stone-600">
                            Ngày: <span className="font-bold text-stone-900">{b.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {sessions.length > 1 && (
                      <section className="mb-5 rounded-2xl border border-stone-200 p-3 sm:p-4" aria-label="Các buổi trong lịch dài hạn">
                        <div className="mb-3 flex items-center justify-between gap-3 px-1">
                          <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-950">
                            <CalendarDays className="h-4 w-4 text-brand-600" aria-hidden="true" /> Lịch đã đặt
                          </h3>
                          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">{sessions.length} buổi</span>
                        </div>
                        <ol className="max-h-80 space-y-2 overflow-y-auto pr-1">
                          {sessions.map((session, index) => (
                            <li key={session.id} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${session.status === "cancelled" ? "border-stone-100 bg-stone-50" : "border-stone-200 bg-white"}`}>
                              <div className="flex min-w-0 items-center gap-3">
                                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${session.status === "cancelled" ? "bg-stone-100 text-stone-500" : "bg-brand-50 text-brand-700"}`}>
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className={`text-sm font-bold ${session.status === "cancelled" ? "text-stone-500 line-through decoration-stone-300" : "text-stone-900"}`}>{session.date} · {session.time}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                                    <span>{session.duration || 1} giờ</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-stone-700">{formatCurrency(session.total)}</span>
                                    <StatusChip status={session.status} size="sm" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 pl-12 sm:justify-end sm:pl-0">
                                <button type="button" onClick={() => openTicket(session)} className="btn-outline min-h-11 rounded-lg px-3 text-xs">
                                  <QrCode className="h-3.5 w-3.5" aria-hidden="true" /> Mở vé
                                </button>
                                {session.bookingGroupId && canModifySession(session) && (
                                  <button type="button" onClick={() => openReschedule(session)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand-800 transition hover:bg-brand-100">
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Đổi buổi
                                  </button>
                                )}
                                {canModifySession(session) && (
                                  <button type="button" onClick={() => openCancelModal(session)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50">
                                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Hủy buổi
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {(b.status === "cancelled" || b.refundStatus === "pending" || b.refundStatus === "completed") && (
                      <div
                        className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                          b.refundStatus === "completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : b.refundStatus === "pending"
                              ? "border-brand-200 bg-brand-50 text-brand-900"
                              : "border-stone-200 bg-stone-50 text-stone-700"
                        }`}
                        role="status"
                      >
                        {b.refundStatus === "completed"
                          ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          : b.refundStatus === "pending"
                            ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                            : <Info className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />}
                        <p>
                          {b.refundStatus === "pending" && (
                            <><strong>Đang hoàn tiền {formatCurrency(b.refundAmount || 0)}{b.refundRate ? " (" + b.refundRate + "%)" : ""}.</strong> {b.refundReason === "duplicate_or_expired_payment" ? "Khoản thanh toán dư/quá hạn không được cộng vào đơn sân hợp lệ." : b.refundReason === "maintenance" ? "Sân bảo trì đột xuất, khách được hoàn 100%." : b.refundReason === "owner_cancelled" ? "Chủ sân hủy, khách được hoàn 100%." : "Yêu cầu đã được gửi tới quản trị viên."}</>
                          )}
                          {b.refundStatus === "completed" && (
                            <><strong>Đã hoàn tiền {formatCurrency(b.refundAmount || 0)}{b.refundRate ? " (" + b.refundRate + "%)" : ""}.</strong> {b.refundReason === "duplicate_or_expired_payment" ? "Đơn sân chính vẫn giữ nguyên hiệu lực." : ["maintenance", "owner_cancelled"].includes(b.refundReason || "") ? "Đã hoàn về phương thức thanh toán ban đầu." : `Ngân hàng: ${b.refundBank || "—"} · STK: ${b.refundStk || "—"}`}</>
                          )}
                          {(!b.refundStatus || b.refundStatus === "none") && (
                            <><strong>Đã hủy đơn.</strong> {b.refundReason === "customer_no_refund" ? "Đã đến hoặc quá giờ sân nên không hoàn tiền." : "Đơn chưa phát sinh thanh toán nên không cần hoàn tiền."}</>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Price and Details */}
                    <div className="flex flex-col gap-4 border-t border-stone-100 pt-5 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-500">{b.groupSize && b.groupSize > 1 ? "Tổng nhóm · " + b.groupSize + " buổi" : "Tổng tiền"}</div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className={`text-2xl font-extrabold tabular-nums ${b.status === "cancelled" ? "text-stone-500" : "text-brand-700"}`}>
                            {formatCurrency(b.groupSize && b.groupSize > 1 ? Number(b.groupTotal || b.total) : b.total)}
                          </span>
                          {b.paymentMethod === "deposit" && b.paymentStatus === "deposit_paid" && (
                            <span className="text-xs font-medium text-stone-500">(Đã cọc 30% · còn {formatCurrency(Math.max(0, Number(b.groupTotal || b.total) - Math.round(Number(b.groupTotal || b.total) * 0.3)))})</span>
                          )}
                          {b.paymentMethod === "deposit" && b.paymentStatus === "unpaid" && (
                            <span className="text-xs font-semibold text-rose-600">(Chưa thanh toán tiền cọc)</span>
                          )}
                          {b.paymentMethod === "cash" && (
                            <span className="text-xs font-medium text-stone-500">(Tiền mặt tại sân)</span>
                          )}
                        </div>
                        {isTransferPaid(b) && ["pending", "confirmed"].includes(b.status) && (
                          <span className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Đã thanh toán · không thể đổi/hủy buổi
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
                        <button
                          type="button"
                          onClick={() => openBookingDetail(b)}
                          className={`btn-outline ${actionBase}`}
                        >
                          <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
                          Xem chi tiết
                        </button>

                        {b.bookingGroupId && canModifySession(b) && (
                          <button type="button" onClick={() => openReschedule(b)} className={`${actionBase} border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" /> Đổi buổi này
                          </button>
                        )}

                        {b.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => openTicket(b, sessions)}
                            className={`btn-outline ${actionBase}`}
                          >
                            <QrCode className="h-4 w-4 text-brand-600" aria-hidden="true" />
                            Xem / In vé
                          </button>
                        )}

                        {b.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => extendOneHour(b)}
                            className={`btn-outline ${actionBase}`}
                          >
                            <Timer className="h-4 w-4 text-brand-600" aria-hidden="true" />
                            Thuê thêm 1h
                          </button>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(b)}
                            className={`${actionBase} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            {b.groupSize && b.groupSize > 1 ? "Hủy buổi này" : "Hủy đơn"}
                          </button>
                        )}

                        {canResumePayment && (
                          <button
                            type="button"
                            onClick={() => resumePayment(b)}
                            className={`btn-primary col-span-2 ${actionBase}`}
                          >
                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                            Thanh toán ngay
                          </button>
                        )}

                        {b.status === "confirmed" && b.paymentStatus === "deposit_paid" && (
                          <button
                            type="button"
                            onClick={() => payBalance(b)}
                            className={`btn-primary col-span-2 ${actionBase}`}
                          >
                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                            Thanh toán 70% còn lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Modal render qua portal để thoát khỏi stacking context/transform của <main> (page-enter). */}
        {createPortal(<>
        {/* QR Check-in Modal */}
        {qrModal.isOpen && (
          <div className={overlay} role="dialog" aria-modal="true" aria-label="Vé check-in điện tử">
            <div className="w-full max-w-2xl py-8 animate-scale-in">
              {qrModal.booking && (qrModal.selectedSession ? <BookingPass booking={qrModal.selectedSession} /> : <BookingPass booking={qrModal.booking} code={qrModal.code || undefined} sessions={qrModal.sessions} onSessionSelect={(session) => setQrModal((current) => ({ ...current, selectedSession: session }))} />)}
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
          const isFullField = detail.bookingMode === "full_field";
          const reservedCourts = detail.reservedCourts || [];
          const groupSchedule = detail.groupSchedule || [];
          const isGrouped = groupSchedule.length > 1;
          const closeDetail = () => setDetailModal({ isOpen: false, loading: false, detail: null });
          return (
            <div className={overlay} role="dialog" aria-modal="true" aria-label="Chi tiết đơn đặt sân">
              <div className="my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in">
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-6 py-6 text-white">
                  <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand-400/40 blur-3xl" aria-hidden="true" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{isFullField ? "Chi tiết đơn bao toàn bộ sân" : "Chi tiết đơn đặt sân"}</p>
                      <h2 className="mt-2 font-mono text-2xl font-extrabold">BK{String(detail.id).padStart(6, "0")}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-800">
                        {statusConfig[detail.status]?.label || "Chờ xác nhận"}
                      </span>
                      <button type="button" onClick={closeDetail} className="grid h-11 w-11 place-items-center rounded-xl text-white/90 transition hover:bg-white/15" aria-label="Đóng chi tiết">
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="relative mt-4 flex items-center gap-3 border-t border-white/20 pt-4 text-sm text-white/90">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    <span>{detail.date} · <strong className="text-white">{detail.time} – {detail.duration || 1} giờ</strong></span>
                  </div>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  {detailModal.loading ? (
                    <div className="space-y-3" aria-busy="true">
                      <span className="sr-only">Đang tải thông tin sân...</span>
                      <div className="skeleton h-24 rounded-2xl" />
                      <div className="grid grid-cols-2 gap-3"><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-20 rounded-2xl" /></div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                          <div>
                            <div className="font-extrabold text-stone-950">{detail.field?.name || detail.fieldName}</div>
                            <div className="mt-1 text-sm font-semibold text-brand-700">
                              {isFullField ? "Bao toàn bộ sân (" + reservedCourts.length + " sân con)" : detail.courtDetail?.name || detail.court}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-stone-600">{address || "Địa chỉ sân đang được cập nhật"}</p>
                          </div>
                        </div>
                        {address && (
                          <a className="btn-outline mt-3 min-h-11 rounded-xl px-3 text-xs" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
                            <Navigation className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Mở chỉ đường
                          </a>
                        )}
                      </div>

                      {isFullField && (
                        <section className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4" aria-label="Các sân con thuộc đơn bao sân">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-extrabold text-stone-950">Các sân con đã giữ</h3>
                            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold text-brand-900">{reservedCourts.length} sân</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {reservedCourts.map((court) => (
                              <div key={court.id} className="rounded-xl border border-brand-100 bg-white px-3 py-2.5">
                                <div className="text-sm font-bold text-stone-900">{court.name}</div>
                                <div className="mt-0.5 text-xs text-stone-500">{court.type || "Sân con"}{court.price ? " · " + formatCurrency(court.price) + "/giờ" : ""}</div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {isGrouped && (
                        <section className="rounded-2xl border border-stone-200 p-4" aria-label="Toàn bộ lịch trong nhóm đặt sân">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-extrabold text-stone-950">Lịch của toàn bộ đơn</h3>
                            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">{groupSchedule.length} buổi</span>
                          </div>
                          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                            {groupSchedule.map((session, index) => (
                              <div key={session.id} className={"flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 " + (session.id === detail.id ? "border-brand-300 bg-brand-50" : "border-stone-100 bg-stone-50")}>
                                <div>
                                  <div className="text-sm font-bold text-stone-900">Buổi {index + 1}: {session.date} · {session.time}</div>
                                  <div className="mt-0.5 text-xs text-stone-500">{session.duration || 1} giờ{session.id === detail.id ? " · Đang xem" : ""}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-extrabold text-brand-700">{formatCurrency(session.total)}</div>
                                  <div className="mt-1"><StatusChip status={session.status} size="sm" /></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-stone-200 p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Thời gian</div><div className="mt-1 text-lg font-extrabold text-stone-900">{detail.time}</div><div className="mt-0.5 text-xs text-stone-500">{detail.duration || 1} giờ thuê</div></div>
                        <div className="rounded-2xl border border-stone-200 p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{isGrouped ? "Giá buổi đang xem" : "Tổng thanh toán"}</div><div className="mt-1 text-lg font-extrabold text-brand-700">{formatCurrency(detail.total)}</div><div className={`mt-0.5 text-xs font-semibold ${detail.paymentStatus === "unpaid" ? "text-rose-600" : "text-emerald-700"}`}>{detail.paymentStatus === "unpaid" ? "Chưa thanh toán" : "Đã ghi nhận thanh toán"}</div></div>
                      </div>

                      {isGrouped && (
                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
                          <div><div className="text-[11px] font-bold uppercase tracking-wider text-brand-800">Tổng toàn bộ nhóm</div><div className="mt-1 text-xs text-stone-600">{groupSchedule.length} buổi{isFullField ? " · " + reservedCourts.length + " sân con mỗi buổi" : ""}</div></div>
                          <div className="text-xl font-extrabold text-brand-700">{formatCurrency(Number(detail.groupTotal || detail.total))}</div>
                        </div>
                      )}

                      {detail.history && detail.history.length > 0 && (
                        <section className="rounded-2xl border border-stone-200 p-4" aria-label="Lịch sử thay đổi của buổi này">
                          <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-950"><History className="h-4 w-4 text-brand-600" aria-hidden="true" /> Lịch sử buổi này</h3>
                          <ol className="mt-3 space-y-3 border-l-2 border-brand-200 pl-4">
                            {detail.history.map((entry, index) => (
                              <li key={entry._id || entry.changedAt + index} className="relative">
                                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                                <div className="text-sm font-bold text-stone-900">{historyLabels[entry.changeType] || entry.changeType}</div>
                                <div className="mt-0.5 text-xs text-stone-500">{new Date(entry.changedAt).toLocaleString("vi-VN")}{entry.reason ? " · " + entry.reason : ""}</div>
                                {Number(entry.paymentDelta || 0) !== 0 && <div className={"mt-1 text-xs font-bold " + (Number(entry.paymentDelta) > 0 ? "text-rose-600" : "text-emerald-700")}>{Number(entry.paymentDelta) > 0 ? "Phụ thu " : "Hoàn/giảm "}{formatCurrency(Math.abs(Number(entry.paymentDelta)))}</div>}
                              </li>
                            ))}
                          </ol>
                        </section>
                      )}

                      {detail.field?.phone && <div className="flex items-center gap-2 text-sm text-stone-600"><Phone className="h-4 w-4 text-brand-600" aria-hidden="true" /> Liên hệ sân: <a className="font-bold text-brand-700 hover:underline" href={`tel:${detail.field.phone}`}>{detail.field.phone}</a></div>}
                    </>
                  )}
                  <button type="button" onClick={closeDetail} className="btn-outline min-h-11 w-full rounded-xl py-3 text-sm">Đóng</button>
                </div>
              </div>
            </div>
          );
        })()}

        <BookingRescheduleModal state={rescheduleModal} setState={setRescheduleModal} onSubmit={submitReschedule} />

        {/* Cancel Refund Modal */}
        {cancelModal.isOpen && (
          <div className={overlay} role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
            <div className="relative my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in sm:p-8">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 id="cancel-modal-title" className="mb-2 text-xl font-extrabold text-stone-950">
                Hủy buổi đặt sân & chính sách hoàn tiền
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-stone-600">
                {cancelModal.refundRate === 100
                  ? "Hủy sớm trước giờ sân ít nhất 2 tiếng: hoàn 100% số tiền đã trả."
                  : cancelModal.refundRate === 50
                    ? "Đang sát giờ sân: hoàn 50% số tiền đã trả."
                    : cancelModal.paidAmount > 0
                      ? "Đã đến hoặc quá giờ sân: đơn vẫn được hủy nhưng không hoàn tiền."
                      : "Đơn chưa thanh toán sẽ được hủy ngay và nhả lại khung giờ."}
              </p>

              {cancelModal.refundAmount > 0 && (
                <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-800">Dự kiến hoàn {cancelModal.refundRate}%</div>
                  <div className="mt-1 text-2xl font-extrabold text-brand-900">{formatCurrency(cancelModal.refundAmount)}</div>
                  <div className="mt-1 text-xs text-brand-900/80">Hệ thống sẽ kiểm tra lại theo thời điểm bạn xác nhận hủy.</div>
                </div>
              )}

              {cancelModal.refundAmount > 0 && <div className="mb-6 space-y-4">
                <div>
                  <label htmlFor="refund-bank" className="mb-2 block text-sm font-semibold text-stone-700">
                    Tên ngân hàng thụ hưởng <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="refund-bank"
                    placeholder="VD: Vietcombank, MBBank, Techcombank..."
                    value={cancelModal.bank}
                    onChange={(e) => setCancelModal({ ...cancelModal, bank: e.target.value })}
                    className="min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
                <div>
                  <label htmlFor="refund-stk" className="mb-2 block text-sm font-semibold text-stone-700">
                    Số tài khoản nhận hoàn tiền <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="refund-stk"
                    inputMode="numeric"
                    placeholder="Nhập chính xác STK ngân hàng..."
                    value={cancelModal.stk}
                    onChange={(e) => setCancelModal({ ...cancelModal, stk: e.target.value })}
                    className="min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-mono text-sm text-stone-900 outline-none transition placeholder:font-sans placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
              </div>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "", paidAmount: 0, refundRate: 0, refundAmount: 0 })}
                  className="btn-outline min-h-11 flex-1 rounded-xl py-3 text-sm"
                >
                  Giữ lại buổi
                </button>
                <button
                  type="button"
                  onClick={submitCancel}
                  className="min-h-11 flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgb(225_29_72/0.6)] transition hover:bg-rose-700 active:scale-[0.98]"
                >
                  Xác nhận hủy buổi
                </button>
              </div>
            </div>
          </div>
        )}
        </>, document.body)}
      </div>
    </div>
  );
}
