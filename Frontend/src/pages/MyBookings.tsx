import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CalendarDays } from "lucide-react";
import { api, Booking, formatCurrency, formatSlotRange } from "../lib/api";
import { formatDateVi } from "../lib/locale";
import { getUser } from "../lib/auth";
import toast from "react-hot-toast";

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xác nhận", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Đã xác nhận", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-700" },
  completed: { label: "Hoàn thành", className: "bg-blue-100 text-blue-700" },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  const [cancelModal, setCancelModal] = useState({ isOpen: false, bookingId: 0, stk: "", bank: "" });
  const [qrModal, setQrModal] = useState<{ isOpen: boolean, code: string | null }>({ isOpen: false, code: null });

  const load = async () => {
    try {
      const res = await api.get<Booking[]>("/bookings");
      const mine = res.data
        .filter(
          (b) =>
            b.customer?.userId === user?.id ||
            b.customer?.email === user?.email ||
            b.customer?.phone === user?.phone
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
        refundBank: cancelModal.bank
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelModal.bookingId ? { ...b, status: "cancelled" } as Booking : b))
      );
      toast.success("Đã hủy đơn và gửi email xác nhận hoàn tiền");
      setCancelModal({ isOpen: false, bookingId: 0, stk: "", bank: "" });
    } catch {
      toast.error("Hủy thất bại");
    }
  };

  /** Thuê thêm 1 giờ ngay sau khung hiện tại (cùng ngày/sân) */
  const extendOneHour = async (b: Booking) => {
    if (!confirm("Thuê thêm 1 giờ ngay sau khung hiện tại?")) return;
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
        customer: {
          ...b.customer,
          note: `Thuê thêm sau đơn BK${String(b.id).padStart(6, "0")}`,
        },
        paymentMethod: b.paymentMethod || "cash",
        paymentStatus: "unpaid",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      toast.success(`Đã tạo đơn thuê thêm: ${newTime} – ${String((nh + 1) % 24).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
      setLoading(true);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thuê thêm được (có thể trùng lịch)";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
        <CalendarDays className="w-6 h-6 text-blue-600" />
        Đơn đặt sân bóng rổ của tôi
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Xin chào {user?.fullName || user?.email}
      </p>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          Chưa có đơn nào.{" "}
          <Link to="/fields" className="text-blue-600 font-semibold">
            Đặt sân ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const st = statusMap[b.status] || statusMap.pending;
            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-3 mb-3">
                  <span className="font-bold text-green-700">
                    BK{String(b.id).padStart(6, "0")}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.className}`}
                  >
                    {st.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Cơ sở: </span>
                    <span className="font-semibold">{b.fieldName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Sân: </span>
                    <span className="font-semibold">{b.court}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Ngày & giờ: </span>
                    <span className="font-semibold">
                      {formatDateVi(b.date)} · {formatSlotRange(b.time, b.duration || 1)} (
                      {b.duration}h)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tổng: </span>
                    <span className="font-extrabold text-blue-600">
                      {formatCurrency(b.total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Khách đặt: </span>
                    <span className="font-semibold">{b.customer?.fullName} ({b.customer?.phone})</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Thanh toán: </span>
                    <span className="font-semibold">
                      {b.paymentMethod === "deposit" || b.paymentMethod === "full" ? "Online" : "Tại sân"} ·{" "}
                      {b.paymentMethod === "deposit" ? "Đã cọc 30%" : b.paymentMethod === "full" ? "Đã thanh toán 100%" : "Chưa TT"}
                    </span>
                  </div>
                  {b.status === "cancelled" && (
                    <div className="sm:col-span-2 mt-1">
                      <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                        * Tiền cọc đang được xử lý hoàn trả (trong 24h)
                      </span>
                    </div>
                  )}
                  {(b.status !== "cancelled") && (
                    <div className="sm:col-span-2 mt-1">
                      <button
                        onClick={() => {
                          const code = `BK${String(b.id).padStart(6, "0")}`;
                          const qrData = `CHECKIN-${code} | Sân: ${b.fieldName} - ${b.court} | Tên: ${b.customer?.fullName || ''} | ĐT: ${b.customer?.phone || ''}`;
                          const url = `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=250`;
                          setQrModal({ isOpen: true, code: url });
                        }}
                        className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                        📱 Xem mã Check-in sân
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  {b.status === "pending" || b.status === "confirmed" ? (
                    <button
                      onClick={() => openCancelModal(b.id)}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Hủy đơn
                    </button>
                  ) : null}
                  {b.status === "pending" || b.status === "confirmed" ? (
                    <button
                      onClick={() => extendOneHour(b)}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Thuê thêm 1 giờ
                    </button>
                  ) : null}
                  <Link
                    to={`/booking?fieldId=${b.fieldId}&courtId=${b.courtId}`}
                    className="text-sm font-semibold text-gray-600 hover:underline"
                  >
                    Đặt lại sân này
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-3 text-gray-900">Hoàn trả tiền cọc/thanh toán</h3>
            <p className="text-gray-600 text-sm mb-4">Bạn chắc chắn muốn hủy đơn này? Vui lòng nhập thông tin ngân hàng để nhận lại tiền hoàn, hệ thống sẽ gửi email xác nhận cho bạn.</p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">Ngân hàng:</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:ring focus:ring-blue-200 outline-none" placeholder="VD: MB Bank, Vietcombank" value={cancelModal.bank} onChange={e => setCancelModal({ ...cancelModal, bank: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Số tài khoản:</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:ring focus:ring-blue-200 outline-none" placeholder="Nhập số tài khoản của bạn" value={cancelModal.stk} onChange={e => setCancelModal({ ...cancelModal, stk: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200" onClick={() => setCancelModal({ ...cancelModal, isOpen: false })}>Đóng</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-sm" onClick={submitCancel}>Xác nhận hủy & Hoàn tiền</button>
            </div>
          </div>
        </div>
      )}

      {qrModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setQrModal({ isOpen: false, code: null })}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-extrabold mb-2 text-gray-900">Mã Check-in sân</h3>
            <p className="text-gray-500 mb-6 text-sm">Đưa mã này cho nhân viên tại sân để nhận sân</p>
            <div className="bg-blue-50 p-4 rounded-xl mb-6 border-2 border-dashed border-blue-300 mx-auto w-fit">
              <img src={qrModal.code || ""} alt="QR Check-in" className="w-48 h-48 mx-auto mix-blend-multiply" />
            </div>
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors" onClick={() => setQrModal({ isOpen: false, code: null })}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
