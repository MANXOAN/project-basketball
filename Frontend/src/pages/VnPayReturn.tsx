import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import { api } from "../lib/api";

export default function VnPayReturn() {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "refund_pending">("loading");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (!searchParams.has("vnp_SecureHash")) {
      setStatus("failed");
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await api.get("/vnpay/return" + location.search);
        setBookingId(res.data.bookingId);
        if (res.data.state === "refund_pending" || res.data.state === "refunded") {
          setStatus("refund_pending");
          setErrorMessage(res.data.message || "Khoản thanh toán đang được xử lý hoàn tiền");
        } else if (res.data.code === "00" && res.data.state === "success") {
          setStatus("success");
        } else {
          setStatus("failed");
          setErrorMessage(res.data.message || "Giao dịch không thành công");
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        setStatus("failed");
        setErrorMessage(error.response?.data?.message || error.message || "Lỗi kết nối máy chủ");
      }
    };

    verifyPayment();
  }, [location.search]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-black text-gray-200">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium text-sm">Đang xác thực kết quả thanh toán từ VNPay...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 py-20 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full bg-zinc-900 rounded-3xl border border-white/10 p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {status === "success" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Thanh Toán Thành Công!</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Giao dịch qua cổng VNPay đã được ghi nhận an toàn. Bạn đã sẵn sàng cho trận đấu sắp tới!
            </p>
            {bookingId && (
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 mb-8">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold block mb-1">Mã đơn đặt sân</span>
                <span className="font-mono text-xl font-black text-yellow-400">BK{String(bookingId).padStart(6, "0")}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${status === "refund_pending" ? "bg-amber-500/10 border border-amber-500/30 text-amber-400" : "bg-rose-500/10 border border-rose-500/30 text-rose-400"}`}>
              {status === "refund_pending" ? <RotateCcw className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">{status === "refund_pending" ? "Đang Xử Lý Hoàn Tiền" : "Thanh Toán Chưa Hoàn Tất"}</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              {status === "refund_pending" ? "Giao dịch đã trừ tiền nhưng đơn không thể nhận thêm khoản thanh toán. Hệ thống đã đưa khoản dư vào hàng chờ hoàn tiền." : "Giao dịch bị hủy hoặc có sự cố xảy ra trong quá trình xử lý qua VNPay."}
            </p>
            {errorMessage && (
              <div className={`text-xs font-semibold p-3.5 rounded-xl mb-8 ${status === "refund_pending" ? "bg-amber-500/10 border border-amber-500/20 text-amber-300" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"}`}>
                Chi tiết: {errorMessage}
              </div>
            )}
          </>
        )}

        <div className="space-y-3">
          <Link
            to="/my-bookings"
            className="btn-primary block w-full py-4 rounded-xl font-extrabold text-sm"
          >
            Xem danh sách đơn của tôi
          </Link>
          <Link
            to="/"
            className="btn-outline block w-full py-3 rounded-xl text-sm"
          >
            Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
