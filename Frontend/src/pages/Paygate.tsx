import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { QrCode, CheckCircle2, Loader2, ArrowLeft, CreditCard, Clock, ShieldCheck, Copy } from "lucide-react";
import { formatCurrency, api } from "../lib/api";
import toast from "react-hot-toast";
import axios from "axios";

export default function Paygate() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"card" | "transfer">("card");

  const payload = location.state?.payload;
  const existingBooking = location.state?.booking;
  const balanceBooking = location.state?.balanceBooking;
  const deposit = location.state?.deposit;
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
      <div className="min-h-screen bg-black text-gray-300 flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy thông tin đơn hàng</h2>
          <p className="text-gray-400 text-sm mb-6">Phiên thanh toán có thể đã hết hạn hoặc dữ liệu không tồn tại.</p>
          <Link to="/" className="btn-primary block py-3 rounded-xl font-bold">
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const isBalancePayment = Boolean(balanceBooking);
  const booking = balanceBooking || existingBooking || payload;
  const amountToPay = isBalancePayment
    ? Math.max(0, Number(balanceBooking.total) - Number(balanceBooking.paidAmount || Math.round(balanceBooking.total * 0.3)))
    : booking.paymentMethod === "deposit" ? (existingBooking ? Math.round(Number(booking.total) * 0.3) : deposit) : (existingBooking ? Number(booking.total) : total);
  const paymentKind = isBalancePayment ? "balance" : booking.paymentMethod === "deposit" ? "deposit" : "full";

  const handleConfirmPayment = async () => {
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

  return (
    <div className="min-h-screen bg-black text-gray-200 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-semibold text-gray-400 hover:text-yellow-400 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Quay lại đặt sân
        </button>

        <div className="bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
          {/* Header Card */}
          <div className="p-8 text-center bg-gradient-to-b from-yellow-500/15 via-zinc-900 to-zinc-900 border-b border-white/5 relative">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold text-yellow-400 mb-4">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              Thời gian giữ chỗ: <span className="text-white font-mono">{formatTime(timeLeft)}</span>
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Xác Nhận Thanh Toán</h2>
            <p className="text-gray-400 text-sm">
              Sân đấu: <span className="text-white font-bold">{booking.fieldName} - {booking.court}</span>
            </p>

            <div className="mt-6 bg-black/60 border border-white/10 p-4 rounded-2xl inline-flex flex-col items-center">
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">
                {isBalancePayment ? "Thanh toán phần còn lại (70%)" : booking.paymentMethod === "deposit" ? "Số tiền cọc giữ chỗ (30%)" : "Tổng tiền thanh toán 100%"}
              </span>
              <span className="text-3xl font-black text-yellow-400">
                {formatCurrency(amountToPay)}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Tabs */}
            <div className="flex bg-black p-1.5 rounded-2xl border border-white/5 mb-8">
              <button
                onClick={() => setTab("card")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                  tab === "card"
                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Cổng VNPay
              </button>
              <button
                onClick={() => setTab("transfer")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                  tab === "transfer"
                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Quét mã VietQR
              </button>
            </div>

            {/* Tab 1: VNPay */}
            {tab === "card" && (
              <div className="bg-black/50 border border-white/5 rounded-2xl p-6 mb-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4 text-yellow-400">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-white text-lg mb-2">Thanh toán tức thì qua VNPay</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed mb-4">
                  Hỗ trợ thẻ ATM nội địa, Thẻ Visa/Mastercard và ứng dụng ngân hàng quét mã QR-Pay an toàn, bảo mật.
                </p>
                <div className="flex justify-center items-center gap-2 text-xs text-yellow-500 font-bold bg-yellow-500/5 py-2 px-4 rounded-xl border border-yellow-500/10 max-w-xs mx-auto">
                  <ShieldCheck className="w-4 h-4" /> Bảo mật mã hóa SSL 256-bit
                </div>
              </div>
            )}

            {/* Tab 2: Chuyển khoản VietQR */}
            {tab === "transfer" && (
              <div className="space-y-5 mb-6">
                <div className="bg-black border border-white/5 rounded-2xl p-5 text-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-white uppercase">{BANK_ID} - MBBANK</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">Số tài khoản:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ACCOUNT_NO, "số tài khoản")}
                      className="font-bold text-yellow-400 hover:underline flex items-center gap-1.5"
                    >
                      {ACCOUNT_NO} <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-gray-400">Chủ tài khoản:</span>
                    <span className="font-bold text-white">{ACCOUNT_NAME}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Nội dung chuyển tiền:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(addInfo, "nội dung")}
                      className="font-mono font-bold text-yellow-400 hover:underline flex items-center gap-1.5"
                    >
                      {addInfo} <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="text-center">
                  <div className="w-60 h-60 mx-auto bg-white p-3 rounded-2xl shadow-xl border-4 border-yellow-500/30 flex items-center justify-center relative group">
                    <img
                      src={vietQrUrl}
                      alt="VietQR Chuyển khoản"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-3">
                    Mở ứng dụng ngân hàng, quét đúng mã và giữ nguyên nội dung chuyển khoản.
                  </p>
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={loading}
                      className="btn-outline mt-4 min-h-11 rounded-xl px-5 text-xs font-bold disabled:opacity-50"
                    >
                      {loading ? "Đang tạo đơn demo..." : "Xác nhận giao dịch demo"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            {tab === "card" ? (
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="btn-primary w-full py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 text-base shadow-xl disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Chuyển tới cổng thanh toán VNPay
              </button>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-400 mx-auto mb-2" />
                <p className="text-xs text-gray-300">
                  Hệ thống đang tự động lắng nghe giao dịch chuyển khoản...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
