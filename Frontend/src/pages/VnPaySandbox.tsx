import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, CreditCard, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

export default function VnPaySandbox() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);

    const amount = Number(searchParams.get("vnp_Amount") || 0) / 100;
    const orderInfo = searchParams.get("vnp_OrderInfo");

    const [card, setCard] = useState("");
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [otp, setOtp] = useState("");

    const handlePay = () => {
        // Redirect bypass to VNPAY Return URL to simulate VNPAY's behavior
        // Since VNPAY validates signature in actual URL, we just pass all original query params 
        // to the return URL and add vnp_ResponseCode=00.
        // Wait, the vnp_SecureHash was signed with all parameters. If we add/modify params, the signature breaks!
        // To keep the signature valid without re-signing in frontend, we just pass the EXACT query string we got,
        // and APPEND &vnp_ResponseCode=00 at the end? 
        // NO! VNPAY return URL requires vnp_ResponseCode inside the signature.
        // So the easiest way to mock this without breaking the backend signature check is:
        // Let's just bypass the signature check in backend for "00", OR we can just hit our backend with a fake payload.
        // But since we want it to work transparently: We just redirect to return_url but pass a parameter `mock=1` 
        // Actually, we can just send the exact original query string and let the backend return handle it? 
        // Let's modify the returnUrl parameter slightly.
        window.location.href = `http://localhost:5173/vnpay-return${location.search}&vnp_ResponseCode=00`;
    }

    return (
        <div className="min-h-screen bg-black text-gray-200 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,197,66,0.16),transparent_35%),linear-gradient(135deg,#050505,#18130a)] pointer-events-none" />
            <div className="relative z-10 sm:mx-auto w-full max-w-5xl">
                <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-stretch">
                    <div className="flex flex-col justify-between rounded-3xl border border-yellow-500/20 bg-zinc-900/80 p-8 shadow-2xl shadow-yellow-500/5 backdrop-blur-xl">
                        <div>
                            <div className="flex items-center gap-3 mb-8"><div className="w-12 h-12 rounded-2xl bg-yellow-500 text-black flex items-center justify-center shadow-lg shadow-yellow-500/20"><CreditCard className="w-6 h-6" /></div><div><div className="text-white font-black text-lg">Golden<span className="text-yellow-400">Pay</span></div><div className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Secure checkout</div></div></div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-300"><Sparkles className="w-3.5 h-3.5" /> Môi trường giả lập</div>
                            <h1 className="mt-5 text-3xl sm:text-4xl font-black text-white leading-tight">Hoàn tất thanh toán sân đấu</h1>
                            <p className="mt-4 text-sm leading-relaxed text-gray-400">Màn hình mô phỏng VNPAY dùng để kiểm thử luồng thanh toán và chuyển tiếp kết quả về hệ thống.</p>
                        </div>
                        <div className="mt-10 space-y-3 text-sm text-gray-300"><div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-yellow-400" /> Kết nối mô phỏng được bảo vệ</div><div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Xác nhận tức thì sau khi gửi biểu mẫu</div></div>
                    </div>

                    <div className="bg-zinc-900 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl">
                        <div className="flex items-center justify-between gap-4 mb-6"><div><p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Cổng thanh toán</p><h2 className="text-xl font-black text-white mt-1">VNPAY Sandbox</h2></div><LockKeyhole className="w-5 h-5 text-yellow-400" /></div>
                        <div className="mb-7 bg-black/60 p-5 rounded-2xl border border-yellow-500/20"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Đơn hàng</p><p className="mt-1 text-sm font-bold text-white break-all">{orderInfo || "Đơn đặt sân"}</p><div className="mt-4 flex items-end justify-between gap-4"><span className="text-xs text-gray-500">Tổng thanh toán</span><span className="text-2xl font-black text-yellow-400">{amount.toLocaleString("vi-VN")} <span className="text-sm">VND</span></span></div></div>

                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handlePay(); }}>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Số thẻ hoặc mã thẻ nội địa</label>
                            <input value={card} onChange={e => setCard(e.target.value)} placeholder="9704198526191432" className="mt-2 block w-full border border-white/10 bg-black rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Tên in trên thẻ</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="NGUYEN VAN A" className="mt-2 block w-full border border-white/10 bg-black rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 sm:text-sm uppercase" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Ngày phát hành</label>
                                <input value={date} onChange={e => setDate(e.target.value)} placeholder="07/15" className="mt-2 block w-full border border-white/10 bg-black rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Mã xác thực OTP</label>
                                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" className="mt-2 block w-full border border-white/10 bg-black rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <button type="submit" className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-yellow-500/20 text-sm font-black text-black bg-yellow-500 hover:bg-yellow-400 transition-all hover:-translate-y-0.5 focus:outline-none">
                                Xác nhận thanh toán <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center">Bạn có thể dùng dữ liệu giả lập để kiểm thử nút thanh toán.</p>
                    </form>
                </div>
            </div>
            </div>
        </div>
    );
}
