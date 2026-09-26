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
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface px-4 text-center" role="status" aria-live="polite">
        <div className="relative mb-6 grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 rounded-full bg-brand-100 animate-ping opacity-60" aria-hidden="true" />
          <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white text-brand-600 shadow-lift ring-1 ring-brand-100">
            <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-stone-950">Đang xác thực thanh toán</h1>
        <p className="mt-2 text-sm font-medium text-stone-600">Đang xác thực kết quả thanh toán từ VNPay...</p>
      </div>
    );
  }

  const tone = status === "success"
    ? { ring: "bg-emerald-50 text-emerald-600 ring-emerald-100", band: "from-emerald-50", icon: <CheckCircle2 className="h-10 w-10" aria-hidden="true" />, eyebrow: "Giao dịch thành công", eyebrowClass: "text-emerald-700" }
    : status === "refund_pending"
      ? { ring: "bg-brand-50 text-brand-600 ring-brand-100", band: "from-brand-50", icon: <RotateCcw className="h-10 w-10" aria-hidden="true" />, eyebrow: "Đang hoàn tiền", eyebrowClass: "text-brand-700" }
      : { ring: "bg-rose-50 text-rose-600 ring-rose-100", band: "from-rose-50", icon: <XCircle className="h-10 w-10" aria-hidden="true" />, eyebrow: "Giao dịch chưa hoàn tất", eyebrowClass: "text-rose-700" };

  return (
    <div className="min-h-[80vh] bg-surface brand-grid py-16 px-4 flex items-center justify-center">
      <div className="card relative w-full max-w-lg overflow-hidden text-center animate-scale-in" role="status" aria-live="polite">
        <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${tone.band} to-transparent pointer-events-none`} aria-hidden="true" />
        <div className="relative p-8 md:p-12">
          <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full ring-8 ${tone.ring} animate-scale-in`}>
            {tone.icon}
          </div>
          <p className={`text-xs font-extrabold uppercase tracking-wider ${tone.eyebrowClass}`}>{tone.eyebrow}</p>

          {status === "success" ? (
            <>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950">Thanh toán thành công!</h1>
              <p className="mt-3 mb-6 text-sm leading-relaxed text-stone-600">
                Giao dịch qua cổng VNPay đã được ghi nhận an toàn. Bạn đã sẵn sàng cho trận đấu sắp tới!
              </p>
              {bookingId && (
                <div className="mb-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-600">Mã đơn đặt sân</span>
                  <span className="font-mono text-2xl font-black text-brand-700">BK{String(bookingId).padStart(6, "0")}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950">{status === "refund_pending" ? "Đang xử lý hoàn tiền" : "Thanh toán chưa hoàn tất"}</h1>
              <p className="mt-3 mb-6 text-sm leading-relaxed text-stone-600">
                {status === "refund_pending" ? "Giao dịch đã trừ tiền nhưng đơn không thể nhận thêm khoản thanh toán. Hệ thống đã đưa khoản dư vào hàng chờ hoàn tiền." : "Giao dịch bị hủy hoặc có sự cố xảy ra trong quá trình xử lý qua VNPay."}
              </p>
              {errorMessage && (
                <div className={`mb-8 rounded-xl border p-3.5 text-left text-xs font-semibold ${status === "refund_pending" ? "border-brand-200 bg-brand-50 text-brand-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                  Chi tiết: {errorMessage}
                </div>
              )}
            </>
          )}

          <div className="space-y-3">
            <Link to="/my-bookings" className="btn-primary w-full min-h-12 rounded-xl text-sm">
              Xem danh sách đơn của tôi
            </Link>
            <Link to="/" className="btn-outline w-full min-h-12 rounded-xl text-sm">
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
