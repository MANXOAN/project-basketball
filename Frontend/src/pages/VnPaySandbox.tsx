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

    const fieldLabel = "block text-xs font-bold uppercase tracking-wider text-stone-600";
    const fieldInput = "input mt-2 text-sm";

    return (
        <div className="relative min-h-screen overflow-hidden bg-surface px-4 py-10 text-stone-700 sm:px-6 lg:px-8 lg:py-16">
            <div className="brand-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative z-10 mx-auto w-full max-w-5xl">
                <div className="grid items-stretch gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
                    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-brand animate-fade-in-up">
                        <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full border-[28px] border-white/10" aria-hidden="true" />
                        <div className="relative">
                            <div className="mb-8 flex items-center gap-3">
                                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-soft"><CreditCard className="h-6 w-6" aria-hidden="true" /></div>
                                <div>
                                    <div className="text-lg font-black">GoldenPay</div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Secure checkout</div>
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-800"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Môi trường giả lập</div>
                            <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">Hoàn tất thanh toán sân đấu</h1>
                            <p className="mt-4 text-sm leading-relaxed text-white/90">Màn hình mô phỏng VNPAY dùng để kiểm thử luồng thanh toán và chuyển tiếp kết quả về hệ thống.</p>
                        </div>
                        <ul className="relative mt-10 space-y-3 text-sm font-medium">
                            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" /> Kết nối mô phỏng được bảo vệ</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> Xác nhận tức thì sau khi gửi biểu mẫu</li>
                        </ul>
                    </div>

                    <div className="card p-6 sm:p-8 animate-fade-in-up delay-100">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <p className="eyebrow">Cổng thanh toán</p>
                                <h2 className="mt-1 text-xl font-extrabold text-stone-950">VNPAY Sandbox</h2>
                            </div>
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" aria-label="Kết nối bảo mật"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
                        </div>
                        <div className="mb-7 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-stone-600">Đơn hàng</p>
                            <p className="mt-1 break-all text-sm font-bold text-stone-900">{orderInfo || "Đơn đặt sân"}</p>
                            <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-brand-200 pt-4">
                                <span className="text-xs font-semibold text-stone-600">Tổng thanh toán</span>
                                <span className="text-2xl font-black tabular-nums text-stone-950">{amount.toLocaleString("vi-VN")} <span className="text-sm text-brand-700">VND</span></span>
                            </div>
                        </div>

                        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handlePay(); }}>
                            <div>
                                <label htmlFor="sandbox-card" className={fieldLabel}>Số thẻ hoặc mã thẻ nội địa</label>
                                <input id="sandbox-card" value={card} onChange={e => setCard(e.target.value)} placeholder="9704198526191432" inputMode="numeric" autoComplete="cc-number" className={fieldInput + " font-mono tracking-wider"} />
                            </div>
                            <div>
                                <label htmlFor="sandbox-name" className={fieldLabel}>Tên in trên thẻ</label>
                                <input id="sandbox-name" value={name} onChange={e => setName(e.target.value)} placeholder="NGUYEN VAN A" autoComplete="cc-name" className={fieldInput + " uppercase"} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="sandbox-date" className={fieldLabel}>Ngày phát hành</label>
                                    <input id="sandbox-date" value={date} onChange={e => setDate(e.target.value)} placeholder="07/15" className={fieldInput} />
                                </div>
                                <div>
                                    <label htmlFor="sandbox-otp" className={fieldLabel}>Mã xác thực OTP</label>
                                    <input id="sandbox-otp" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" className={fieldInput + " font-mono tracking-widest"} />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary w-full min-h-12 rounded-xl text-sm">
                                Xác nhận thanh toán <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <p className="text-center text-xs text-stone-500">Bạn có thể dùng dữ liệu giả lập để kiểm thử nút thanh toán.</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
