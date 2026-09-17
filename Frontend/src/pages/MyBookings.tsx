import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CalendarDays, Clock, MapPin, CreditCard, CheckCircle, XCircle, AlertCircle, RefreshCw, QrCode, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { api, Booking, formatCurrency, formatSlotRange } from "../lib/api";
import { formatDateVi } from "../lib/locale";
import { getUser } from "../lib/auth";
import toast from "react-hot-toast";

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

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: 0, stk: "", bank: "" });
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; code: string | null; booking?: Booking | null }>({
    isOpen: false,
    code: null,
    booking: null,
  });

  const load = async () => {
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
      setBookings(mine);
    } catch {
      toast.error("Không tải được đơn đặt sân");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id, user?.email, user?.phone]);

  const openCancelModal = (id: number) => {
    setCancelModal({ isOpen: true, bookingId: id, stk: "", bank: "" });
  };

  const submitCancel = async () => {
    if (!cancelModal.stk || !cancelModal.bank) {
      toast.error("Vui lòng nhập Số tài khoản và Ngân hàng để hoàn tiền");
      return;
    }
    try {
      await api.patch(`/bookings/${cancelModal.bookingId}`, {
        status: "cancelled",
        refundStk: cancelModal.stk,
        refundBank: cancelModal.bank,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelModal.bookingId ? ({ ...b, status: "cancelled" } as Booking) : b))
      );
      toast.success("Đã hủy đơn và gửi yêu cầu hoàn tiền thành công");
      setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "" });
    } catch {
      toast.error("Hủy thất bại");
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
      <div className="flex flex-col items-center justify-center py-36 gap-3 bg-black min-h-screen">
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
    <div className="min-h-screen bg-black text-gray-200 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="bg-zinc-900 rounded-3xl border border-white/5 p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-3xl shadow-inner text-yellow-400 font-black">
                {(user?.fullName || user?.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-yellow-400" />
                  Đơn Đặt Sân Của Tôi
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Khách hàng: <strong className="text-white">{user?.fullName || user?.email}</strong>
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
              { label: "Tổng đơn đặt", value: stats.total, color: "text-white", border: "border-white/5" },
              { label: "Đã xác nhận", value: stats.confirmed, color: "text-emerald-400", border: "border-emerald-500/20" },
              { label: "Chờ xác nhận", value: stats.pending, color: "text-amber-400", border: "border-amber-500/20" },
              { label: "Đã hủy", value: stats.cancelled, color: "text-rose-400", border: "border-rose-500/20" },
            ].map((s) => (
              <div key={s.label} className={`bg-black/60 rounded-2xl p-4 text-center border ${s.border}`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-gray-400 text-xs mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-zinc-900 rounded-3xl border border-white/5 p-16 text-center shadow-xl">
            <div className="text-6xl mb-4 opacity-70">🏀</div>
            <h3 className="text-xl font-bold text-white mb-2">Bạn chưa có đơn đặt sân nào</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
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

              return (
                <div
                  key={b.id}
                  className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden hover:border-yellow-500/30 transition-all shadow-lg group"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/5 gap-3 bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                      <span className="font-mono font-bold text-white text-base">{bookingCode}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${st.className}`}>
                        {st.icon}
                        {st.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      Tạo lúc: {b.createdAt ? new Date(b.createdAt).toLocaleString("vi-VN") : "Gần đây"}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-yellow-400 shrink-0 mt-1" />
                        <div>
                          <div className="font-extrabold text-white text-base">{b.fieldName}</div>
                          <div className="text-xs text-gray-400 mt-0.5 font-medium">Sân thi đấu: <span className="text-yellow-400 font-bold">{b.court}</span></div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-1" />
                        <div>
                          <div className="font-extrabold text-white text-base">
                            {b.time} ({b.duration || 1} giờ)
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 font-medium">
                            Ngày: <span className="text-white font-bold">{b.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price and Details */}
                    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-white/5 gap-4">
                      <div>
                        <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Tổng tiền</div>
                        <div className="text-xl font-black text-yellow-400">
                          {formatCurrency(b.total)}
                          {b.paymentMethod === "deposit" && (
                            <span className="text-xs text-gray-400 font-normal ml-2">(Đã cọc 30%)</span>
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
                          onClick={() => setQrModal({ isOpen: true, code: bookingCode, booking: b })}
                          className="bg-black hover:bg-yellow-500 hover:text-black text-white border border-white/10 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Mã QR Check-in
                        </button>

                        {b.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => extendOneHour(b)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-gray-200 border border-white/5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
                            Thuê thêm 1h
                          </button>
                        )}

                        {b.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(b.id)}
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-yellow-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
              <h3 className="text-xl font-black text-white mb-2">Thẻ Check-in Điện Tử</h3>
              <p className="text-gray-400 text-xs mb-6">Mã đơn: <span className="font-mono text-yellow-400 font-bold">{qrModal.code}</span></p>

              <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-inner">
                <img
                  src={`https://quickchart.io/qr?text=${encodeURIComponent(
                    `CHECKIN-${qrModal.code} | Sân: ${qrModal.booking?.fieldName} - ${qrModal.booking?.court} | Giờ: ${qrModal.booking?.time} | Ngày: ${qrModal.booking?.date}`
                  )}&size=200`}
                  alt="QR Check-in"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <p className="text-xs text-gray-400 mb-6 font-medium">
                Xuất trình mã này cho nhân viên quản lý sân khi bạn đến nhận sân thi đấu.
              </p>

              <button
                type="button"
                onClick={() => setQrModal({ isOpen: false, code: null, booking: null })}
                className="btn-primary w-full py-3 rounded-xl font-bold text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Cancel Refund Modal */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-rose-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                Hủy Đơn & Yêu Cầu Hoàn Tiền
              </h3>
              <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                Theo quy chế của GoldenState, bạn sẽ được hoàn 100% số tiền đã cọc/thanh toán nếu hủy trước giờ bắt đầu thi đấu 2 tiếng.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Tên ngân hàng thụ hưởng *
                  </label>
                  <input
                    placeholder="VD: Vietcombank, MBBank, Techcombank..."
                    value={cancelModal.bank}
                    onChange={(e) => setCancelModal({ ...cancelModal, bank: e.target.value })}
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Số tài khoản nhận hoàn tiền *
                  </label>
                  <input
                    placeholder="Nhập chính xác STK ngân hàng..."
                    value={cancelModal.stk}
                    onChange={(e) => setCancelModal({ ...cancelModal, stk: e.target.value })}
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "" })}
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
