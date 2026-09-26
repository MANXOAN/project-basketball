import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, CalendarDays, Clock, MapPin, CheckCircle, XCircle, AlertCircle, RefreshCw, QrCode, FileText, Phone, Navigation, Printer } from "lucide-react";
import { api, Booking, Field, formatCurrency, formatSlotRange, getBookingsByDate, invalidateApiCache, isSlotConflict } from "../lib/api";
import { getUser } from "../lib/auth";
import { isPastVietnamSlot, vietnamTodayIso } from "../lib/bookingTime";
import toast from "react-hot-toast";
import BookingPass from "../components/BookingPass";

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

function newestBookingFirst(a: Booking, b: Booking) {
  const aCreatedAt = Date.parse(a.createdAt || "");
  const bCreatedAt = Date.parse(b.createdAt || "");
  if (Number.isFinite(aCreatedAt) && Number.isFinite(bCreatedAt) && aCreatedAt !== bCreatedAt) return bCreatedAt - aCreatedAt;
  return Number(b.id) - Number(a.id);
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
  const [scheduleModal, setScheduleModal] = useState<{ booking: Booking | null; date: string; time: string }>({
    booking: null,
    date: "",
    time: "",
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleAvailability, setScheduleAvailability] = useState<{ field: Field | null; bookings: Booking[] }>({ field: null, bookings: [] });
  const [scheduleAvailabilityLoading, setScheduleAvailabilityLoading] = useState(false);
  const [scheduleAvailabilityError, setScheduleAvailabilityError] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const scheduleFieldId = scheduleModal.booking?.fieldId;
  useEffect(() => {
    if (!scheduleFieldId || !scheduleModal.date) return;
    let active = true;
    setScheduleAvailabilityLoading(true);
    setScheduleAvailabilityError("");
    Promise.all([
      api.get<Field>(`/fields/${scheduleFieldId}`),
      getBookingsByDate(scheduleModal.date, true),
    ]).then(([fieldResponse, dayBookings]) => {
      if (!active) return;
      setScheduleAvailability({ field: fieldResponse.data, bookings: dayBookings });
    }).catch(() => {
      if (!active) return;
      setScheduleAvailability({ field: null, bookings: [] });
      setScheduleAvailabilityError("Không tải được lịch trống. Vui lòng thử lại.");
    }).finally(() => {
      if (active) setScheduleAvailabilityLoading(false);
    });
    return () => { active = false; };
  }, [scheduleFieldId, scheduleModal.date]);

  const scheduleTimeSlots = useMemo(() => {
    const booking = scheduleModal.booking;
    const field = scheduleAvailability.field;
    if (!booking || !field || !scheduleModal.date) return [];

    const [openHour, openMinute] = (field.openTime || "06:00").split(":").map(Number);
    const [closeHour, closeMinute] = (field.closeTime || "22:00").split(":").map(Number);
    const openAt = openHour * 60 + openMinute;
    const closeAt = closeHour * 60 + closeMinute;
    const duration = Number(booking.duration || 1);
    const courtIds = booking.reservedCourtIds?.length ? booking.reservedCourtIds : [booking.courtId];
    const slots: Array<{ time: string; disabled: boolean }> = [];

    for (let minute = openAt; minute < closeAt; minute += 30) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const outsideOpeningHours = minute + duration * 60 > closeAt;
      const isPast = isPastVietnamSlot(scheduleModal.date, time, clockNow);
      const isBooked = scheduleAvailability.bookings.some((other) => {
        if (other.id === booking.id || other.status === "cancelled") return false;
        const overlapsReservedCourt = courtIds.some((courtId) =>
          other.courtId === courtId || other.reservedCourtIds?.includes(courtId)
        );
        return overlapsReservedCourt && isSlotConflict(other.time, other.duration || 1, time, duration);
      });
      slots.push({ time, disabled: outsideOpeningHours || isPast || isBooked });
    }
    return slots;
  }, [scheduleModal.booking, scheduleModal.date, scheduleAvailability, clockNow]);

  const selectedScheduleSlotAvailable = scheduleTimeSlots.some((slot) =>
    slot.time === scheduleModal.time && !slot.disabled
  );

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

  const payBalance = (booking: Booking) => {
    const activeGroupBookings = booking.bookingGroupId
      ? bookings.filter((item) => item.bookingGroupId === booking.bookingGroupId && item.status !== "cancelled")
      : [booking];
    const groupPaidAmount = activeGroupBookings.reduce((sum, item) => {
      if (Number(item.paidAmount) > 0) return sum + Number(item.paidAmount);
      if (item.paymentStatus === "deposit_paid") return sum + Math.round(Number(item.total) * 0.3);
      if (item.paymentStatus === "paid") return sum + Number(item.total);
      return sum;
    }, 0);
    navigate("/paygate", { state: { balanceBooking: { ...booking, groupPaidAmount } } });
  };

  const resumePayment = (booking: Booking) => {
    navigate("/paygate", { state: { booking } });
  };

  const openTicket = async (booking: Booking, sessions?: Booking[]) => {
    const code = sessions && sessions.length > 1
      ? "LG" + String(booking.id).padStart(6, "0")
      : "BK" + String(booking.id).padStart(6, "0");
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

  const openScheduleModal = (booking: Booking) => {
    setScheduleModal({ booking, date: booking.date, time: booking.time });
  };

  const submitReschedule = async () => {
    const booking = scheduleModal.booking;
    if (!booking || !scheduleModal.date || !scheduleModal.time) {
      toast.error("Vui lòng chọn ngày và giờ mới");
      return;
    }
    if (scheduleAvailabilityLoading || scheduleAvailabilityError || !selectedScheduleSlotAvailable) {
      toast.error("Khung giờ này đã kín hoặc chưa kiểm tra được lịch trống");
      return;
    }
    setScheduleSaving(true);
    try {
      const response = await api.post<Booking>(`/bookings/${booking.id}/reschedule`, {
        date: scheduleModal.date,
        time: scheduleModal.time,
      });
      invalidateApiCache(`bookings:date:${booking.date}`);
      invalidateApiCache(`bookings:date:${response.data.date}`);
      setBookings((previous) => previous.map((item) => item.id === booking.id ? response.data : item));
      setScheduleModal({ booking: null, date: "", time: "" });
      toast.success("Đã đổi lịch buổi này; các buổi khác được giữ nguyên");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Không thể đổi lịch. Vui lòng kiểm tra giờ mới.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const extendOneHour = async (b: Booking) => {
    if (!confirm("Bạn có muốn gia hạn thuê thêm 1 giờ ngay sau khung hiện tại?")) return;
    try {
      const response = await api.post<Booking>(`/bookings/${b.id}/extend`);
      setBookings((previous) => previous.map((item) => item.id === b.id ? response.data : item));
      toast.success("Đã gia hạn 1 giờ trong cùng đơn đặt sân");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Không thể gia hạn thêm giờ");
    }
  };

  const paymentRepresentativeIds = useMemo(() => {
    const groupMembers = new Map<string, Booking[]>();
    const representatives = new Set<number>();
    bookings.forEach((booking) => {
      if (!booking.bookingGroupId) {
        representatives.add(booking.id);
        return;
      }
      const members = groupMembers.get(booking.bookingGroupId) || [];
      members.push(booking);
      groupMembers.set(booking.bookingGroupId, members);
    });
    groupMembers.forEach((members) => {
      const activeMembers = members.filter((booking) => booking.status !== "cancelled");
      const representative = activeMembers[0];
      if (representative) representatives.add(representative.id);
    });
    return representatives;
  }, [bookings]);
  const paidAmountByGroup = useMemo(() => {
    const amounts = new Map<string, number>();
    bookings.forEach((booking) => {
      if (!booking.bookingGroupId || booking.status === "cancelled") return;
      amounts.set(
        booking.bookingGroupId,
        (amounts.get(booking.bookingGroupId) || 0) + Number(booking.paidAmount || 0)
      );
    });
    return amounts;
  }, [bookings]);
  const bookingCards = useMemo(() => {
    const groups = new Map<string, Booking[]>();
    bookings.forEach((booking) => {
      const key = booking.bookingGroupId || `booking:${booking.id}`;
      const members = groups.get(key) || [];
      members.push(booking);
      groups.set(key, members);
    });
    return [...groups.entries()]
      .map(([key, sessions]) => ({
        key,
        sessions: sessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id - b.id),
      }))
      .sort((a, b) => newestBookingFirst(a.sessions[0], b.sessions[0]));
  }, [bookings]);

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
            {bookingCards.map(({ key, sessions }) => {
              const isGroupedBooking = Boolean(sessions[0].bookingGroupId && sessions.length > 1);
              const b = sessions.find((session) => paymentRepresentativeIds.has(session.id)) || sessions[0];
              const st = statusConfig[b.status] || statusConfig.pending;
              const bookingCode = isGroupedBooking
                ? `Lịch dài hạn · ${sessions.length} buổi`
                : `BK${String(b.id).padStart(6, "0")}`;
              const canCancel = b.status === "pending" || b.status === "confirmed";
              const isPaymentRepresentative = paymentRepresentativeIds.has(b.id);
              const groupTotal = Number(b.groupTotal || b.total);
              const amountPaid = b.bookingGroupId
                ? paidAmountByGroup.get(b.bookingGroupId) || 0
                : Number(b.paidAmount || 0);
              const depositAmount = amountPaid > 0 ? amountPaid : Math.round(groupTotal * 0.3);
              const canResumePayment = b.status === "pending" && b.paymentStatus === "unpaid" &&
                (!b.paymentExpiresAt || new Date(b.paymentExpiresAt).getTime() > Date.now()) &&
                isPaymentRepresentative;

              return (
                <div
                  key={key}
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
                    {isGroupedBooking ? (
                      <div className="mb-6 divide-y divide-slate-100 border-y border-slate-100">
                        <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-4 py-2 text-[10px] font-bold uppercase text-slate-400 md:grid">
                          <span>Buổi · sân</span><span>Ngày · giờ</span><span>Giá buổi</span><span>Thao tác</span>
                        </div>
                        {sessions.map((session, index) => {
                          const sessionCanCancel = session.status === "pending" || session.status === "confirmed";
                          return (
                            <div key={session.id} className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[1fr_1fr_0.7fr_auto] md:items-center">
                              <div>
                                <div className="font-bold text-slate-900">Buổi {index + 1} · {session.fieldName}</div>
                                <div className="mt-0.5 text-xs text-slate-500">Sân: <span className="font-bold text-amber-700">{session.court}</span></div>
                              </div>
                              <div className="text-sm font-semibold text-slate-700">
                                {session.date} · {formatSlotRange(session.time, session.duration || 1)}
                              </div>
                              <div className="text-sm font-bold text-slate-800">{formatCurrency(session.total)}</div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {sessionCanCancel && (
                                  <button type="button" onClick={() => openScheduleModal(session)} className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50">
                                    Đổi lịch
                                  </button>
                                )}
                                {session.status !== "cancelled" && (
                                  <button type="button" onClick={() => openTicket(session)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                    Vé
                                  </button>
                                )}
                                {sessionCanCancel && (
                                  <button type="button" onClick={() => openCancelModal(session)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">
                                    Hủy buổi
                                  </button>
                                )}
                                {!sessionCanCancel && session.status === "cancelled" && (
                                  <span className="text-xs font-bold text-rose-500">Đã hủy</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                          <div>
                            <div className="font-extrabold text-slate-900 text-base">{b.fieldName}</div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium">Sân thi đấu: <span className="text-amber-600 font-bold">{b.court}</span></div>
                            {b.bookingMode === "full_field" && (
                              <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase text-amber-800">
                                Bao toàn bộ sân · {b.reservedCourtIds?.length || 0} sân con
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                          <div>
                            <div className="font-extrabold text-slate-900 text-base">{b.time} ({b.duration || 1} giờ)</div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium">Ngày: <span className="text-slate-900 font-bold">{b.date}</span></div>
                            {Number(b.extensionHours) > 0 && (
                              <div className="mt-1 text-xs font-bold text-amber-700">
                                Thuê thêm: {formatSlotRange(b.time, Math.max(0, (b.duration || 1) - Number(b.extensionHours))).split(" – ")[1]} – {formatSlotRange(b.time, b.duration || 1).split(" – ")[1]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {(b.status === "cancelled" || b.refundStatus === "pending" || b.refundStatus === "completed") && (
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
                          <><strong>Đang hoàn tiền {formatCurrency(b.refundAmount || 0)}{b.refundRate ? " (" + b.refundRate + "%)" : ""}.</strong> {b.refundReason === "duplicate_or_expired_payment" ? "Khoản thanh toán dư/quá hạn không được cộng vào đơn sân hợp lệ." : b.refundReason === "maintenance" ? "Sân bảo trì đột xuất, khách được hoàn 100%." : b.refundReason === "owner_cancelled" ? "Chủ sân hủy, khách được hoàn 100%." : "Yêu cầu đã được gửi tới quản trị viên."}</>
                        )}
                        {b.refundStatus === "completed" && (
                          <><strong>Đã hoàn tiền {formatCurrency(b.refundAmount || 0)}{b.refundRate ? " (" + b.refundRate + "%)" : ""}.</strong> {b.refundReason === "duplicate_or_expired_payment" ? "Đơn sân chính vẫn giữ nguyên hiệu lực." : ["maintenance", "owner_cancelled"].includes(b.refundReason || "") ? "Đã hoàn về phương thức thanh toán ban đầu." : `Ngân hàng: ${b.refundBank || "—"} · STK: ${b.refundStk || "—"}`}</>
                        )}
                        {(!b.refundStatus || b.refundStatus === "none") && (
                          <><strong>Đã hủy đơn.</strong> {b.refundReason === "customer_no_refund" ? "Đã đến hoặc quá giờ sân nên không hoàn tiền." : "Đơn chưa phát sinh thanh toán nên không cần hoàn tiền."}</>
                        )}
                      </div>
                    )}

                    {/* Price and Details */}
                    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-4">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{b.groupSize && b.groupSize > 1 ? "Tổng nhóm · " + b.groupSize + " buổi" : "Tổng tiền"}</div>
                        <div className="text-xl font-black text-amber-600">
                          {formatCurrency(b.groupSize && b.groupSize > 1 ? groupTotal : b.total)}
                          {b.paymentStatus === "deposit_paid" && (
                            <span className="text-xs text-gray-400 font-normal ml-2">(Đã thanh toán {formatCurrency(depositAmount)} · còn {formatCurrency(Math.max(0, groupTotal - depositAmount))})</span>
                          )}
                          {b.paymentStatus === "paid" && (
                            <span className="mt-1 block text-xs font-bold text-emerald-700">
                              Đã thanh toán đủ 100% · {formatCurrency(amountPaid > 0 ? amountPaid : groupTotal)}
                            </span>
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

                        {isGroupedBooking && (
                          <button
                            type="button"
                            onClick={() => openTicket(b, sessions)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                          >
                            <Printer className="h-3.5 w-3.5" /> In cả lịch
                          </button>
                        )}

                        {!isGroupedBooking && b.groupSize && b.groupSize > 1 && canCancel && (
                          <button
                            type="button"
                            onClick={() => openScheduleModal(b)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
                          >
                            <CalendarDays className="h-3.5 w-3.5" /> Đổi buổi này
                          </button>
                        )}

                        {!isGroupedBooking && b.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => openTicket(b)}
                          className="bg-slate-950 hover:bg-amber-400 hover:text-slate-950 text-white border border-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Xem / In vé
                        </button>
                        )}

                        {!isGroupedBooking && b.status !== "cancelled" && (
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

                        {b.status === "confirmed" && b.paymentStatus === "deposit_paid" && isPaymentRepresentative && (
                          <button
                            type="button"
                            onClick={() => payBalance(b)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                          >
                            {b.groupSize && b.groupSize > 1 ? "Thanh toán phần còn lại của lịch" : "Thanh toán phần còn lại"}
                          </button>
                        )}

                        {!isGroupedBooking && canCancel && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(b)}
                            className="text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                          >
                            Hủy đơn
                          </button>
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
              {qrModal.booking && (qrModal.selectedSession ? (
                <>
                  <button
                    type="button"
                    onClick={() => setQrModal((current) => ({ ...current, selectedSession: null }))}
                    className="mb-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
                  >
                    Quay lại vé cả lịch
                  </button>
                  <BookingPass booking={qrModal.selectedSession} />
                </>
              ) : (
                <BookingPass
                  booking={qrModal.booking}
                  code={qrModal.code || undefined}
                  sessions={qrModal.sessions}
                  onSessionSelect={(session) => setQrModal((current) => ({ ...current, selectedSession: session }))}
                />
              ))}
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
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Chi tiết đơn đặt sân">
              <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 px-6 py-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{isFullField ? "Chi tiết đơn bao toàn bộ sân" : "Chi tiết đơn đặt sân"}</p>
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
                            <div className="mt-1 text-sm font-semibold text-amber-700">
                              {isFullField ? "Bao toàn bộ sân (" + reservedCourts.length + " sân con)" : detail.courtDetail?.name || detail.court}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{address || "Địa chỉ sân đang được cập nhật"}</p>
                          </div>
                        </div>
                        {address && (
                          <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 underline decoration-amber-400 decoration-2 underline-offset-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
                            <Navigation className="h-3.5 w-3.5" /> Mở chỉ đường
                          </a>
                        )}
                      </div>

                      {isFullField && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4" aria-label="Các sân con thuộc đơn bao sân">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-black text-slate-950">Các sân con đã giữ</h3>
                            <span className="rounded-full bg-amber-200 px-2.5 py-1 text-[11px] font-black text-amber-900">{reservedCourts.length} sân</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {reservedCourts.map((court) => (
                              <div key={court.id} className="rounded-xl border border-amber-100 bg-white px-3 py-2.5">
                                <div className="text-sm font-bold text-slate-900">{court.name}</div>
                                <div className="mt-0.5 text-xs text-slate-500">{court.type || "Sân con"}{court.price ? " · " + formatCurrency(court.price) + "/giờ" : ""}</div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {isGrouped && (
                        <section className="rounded-2xl border border-slate-200 p-4" aria-label="Toàn bộ lịch trong nhóm đặt sân">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-black text-slate-950">Lịch của toàn bộ đơn</h3>
                            <span className="text-xs font-bold text-slate-500">{groupSchedule.length} buổi</span>
                          </div>
                          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                            {groupSchedule.map((session, index) => (
                              <div key={session.id} className={"flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 " + (session.id === detail.id ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-slate-50")}>
                                <div>
                                  <div className="text-sm font-bold text-slate-900">Buổi {index + 1}: {session.date} · {session.time}</div>
                                  <div className="mt-0.5 text-xs text-slate-500">{session.duration || 1} giờ{session.id === detail.id ? " · Đang xem" : ""}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-amber-700">{formatCurrency(session.total)}</div>
                                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{statusConfig[session.status]?.label || session.status}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Thời gian</div><div className="mt-1 font-black text-slate-900">{detail.time}</div><div className="mt-1 text-xs text-slate-500">{detail.duration || 1} giờ thuê</div></div>
                        <div className="rounded-2xl border border-slate-100 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">{isGrouped ? "Giá buổi đang xem" : "Tổng thanh toán"}</div><div className="mt-1 font-black text-amber-600">{formatCurrency(detail.total)}</div><div className="mt-1 text-xs text-slate-500">{detail.paymentStatus === "unpaid" ? "Chưa thanh toán" : "Đã ghi nhận thanh toán"}</div></div>
                      </div>

                      {isGrouped && (
                        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 text-white">
                          <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng toàn bộ nhóm</div><div className="mt-1 text-xs text-slate-300">{groupSchedule.length} buổi{isFullField ? " · " + reservedCourts.length + " sân con mỗi buổi" : ""}</div></div>
                          <div className="text-xl font-black text-amber-300">{formatCurrency(Number(detail.groupTotal || detail.total))}</div>
                        </div>
                      )}

                      {detail.field?.phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4 text-amber-600" /> Liên hệ sân: <a className="font-bold text-slate-950" href={`tel:${detail.field.phone}`}>{detail.field.phone}</a></div>}
                    </>
                  )}
                  <button type="button" onClick={() => setDetailModal({ isOpen: false, loading: false, detail: null })} className="min-h-11 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-amber-500 hover:text-slate-950">Đóng</button>
                </div>
              </div>
            </div>
          );
        })()}

        {scheduleModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><CalendarDays className="h-5 w-5" /></span>
                <div>
                  <h2 id="reschedule-title" className="text-xl font-black text-slate-950">Đổi lịch buổi này</h2>
                  <p className="mt-1 text-sm text-slate-500">BK{String(scheduleModal.booking.id).padStart(6, "0")} · {scheduleModal.booking.fieldName}</p>
                </div>
              </div>
              <p className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                Chỉ ngày và giờ của buổi này thay đổi. Sân, thời lượng, giá và các buổi còn lại trong lịch nhóm được giữ nguyên.
              </p>
              <div className="mt-5 grid gap-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ngày mới
                  <input type="date" min={vietnamTodayIso()} value={scheduleModal.date} onChange={(event) => setScheduleModal((current) => ({ ...current, date: event.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400" />
                </label>
                <fieldset>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Khung giờ còn trống · mỗi 30 phút</legend>
                  {scheduleModal.time && scheduleModal.booking && (
                    <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div><div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Giờ bắt đầu</div><div className="mt-1 text-base font-black text-slate-950">{scheduleModal.time}</div></div>
                      <div><div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Giờ kết thúc</div><div className="mt-1 text-base font-black text-slate-950">{formatSlotRange(scheduleModal.time, scheduleModal.booking.duration || 1).split(" – ")[1]}</div></div>
                    </div>
                  )}
                  {scheduleAvailabilityLoading ? (
                    <div className="flex min-h-16 items-center gap-2 text-sm font-semibold text-slate-500" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải khung giờ...</div>
                  ) : scheduleAvailabilityError ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{scheduleAvailabilityError}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {scheduleTimeSlots.map((slot) => {
                        const selected = scheduleModal.time === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={slot.disabled}
                            aria-pressed={selected}
                            aria-label={`${formatSlotRange(slot.time, scheduleModal.booking?.duration || 1)}${slot.disabled ? ", không khả dụng" : ""}`}
                            onClick={() => setScheduleModal((current) => ({ ...current, time: slot.time }))}
                            className={`min-h-14 rounded-xl border px-2 py-1.5 text-xs font-bold transition ${selected ? "border-amber-400 bg-amber-400 text-slate-950" : slot.disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:text-amber-800"}`}
                          >
                            <span className="block">{slot.time}</span>
                            <span className={`mt-0.5 block text-[10px] font-semibold ${selected ? "text-slate-800" : "text-slate-500"}`}>
                              {formatSlotRange(slot.time, scheduleModal.booking?.duration || 1).split(" – ")[1]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!scheduleAvailabilityLoading && !scheduleAvailabilityError && scheduleTimeSlots.length > 0 && scheduleTimeSlots.every((slot) => slot.disabled) && (
                    <p className="mt-2 text-xs font-semibold text-slate-500">Ngày này không còn khung giờ phù hợp cho thời lượng đã đặt.</p>
                  )}
                </fieldset>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Lịch mới cần còn trống và nằm trong giờ hoạt động của cơ sở. Nếu slot bị người khác đặt trước, lịch hiện tại sẽ được giữ nguyên.</p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="button" disabled={scheduleSaving} onClick={() => setScheduleModal({ booking: null, date: "", time: "" })} className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50">Để sau</button>
                <button type="button" disabled={scheduleSaving || scheduleAvailabilityLoading || Boolean(scheduleAvailabilityError) || !selectedScheduleSlotAvailable} onClick={submitReschedule} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white transition hover:bg-amber-400 hover:text-slate-950 disabled:opacity-50">{scheduleSaving ? "Đang cập nhật..." : "Xác nhận đổi lịch"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Refund Modal */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-3xl p-8 max-w-md w-full shadow-xl relative">
              <h3 className="text-xl font-black text-slate-950 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                Hủy đơn & Chính sách hoàn tiền
              </h3>
              <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                {cancelModal.refundRate === 100
                  ? "Hủy sớm trước giờ sân ít nhất 2 tiếng: hoàn 100% số tiền đã trả."
                  : cancelModal.refundRate === 50
                    ? "Đang sát giờ sân: hoàn 50% số tiền đã trả."
                    : cancelModal.paidAmount > 0
                      ? "Đã đến hoặc quá giờ sân: đơn vẫn được hủy nhưng không hoàn tiền."
                      : "Đơn chưa thanh toán sẽ được hủy ngay và nhả lại khung giờ."}
              </p>

              {bookings.find((booking) => booking.id === cancelModal.bookingId)?.groupSize && Number(bookings.find((booking) => booking.id === cancelModal.bookingId)?.groupSize) > 1 && (
                <p className="-mt-3 mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">
                  Chỉ hủy buổi đang chọn; các buổi khác trong lịch nhóm vẫn giữ nguyên.
                </p>
              )}

              {cancelModal.refundAmount > 0 && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Dự kiến hoàn {cancelModal.refundRate}%</div>
                  <div className="mt-1 text-2xl font-black text-amber-900">{formatCurrency(cancelModal.refundAmount)}</div>
                  <div className="mt-1 text-xs text-amber-800">Backend sẽ kiểm tra lại theo thời điểm bạn xác nhận hủy.</div>
                </div>
              )}

              {cancelModal.refundAmount > 0 && <div className="space-y-4 mb-6">
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
                  onClick={() => setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "", paidAmount: 0, refundRate: 0, refundAmount: 0 })}
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
