import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QrCode, CheckCircle2, Loader2, ArrowLeft, CreditCard, Smartphone } from "lucide-react";
import { formatCurrency, api } from "../lib/api";
import toast from "react-hot-toast";

export default function Paygate() {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"momo" | "card" | "transfer">("momo");

    // State thời gian đếm ngược: 15 phút = 900 giây
    const [timeLeft, setTimeLeft] = useState(15 * 60);

    const payload = location.state?.payload;
    const deposit = location.state?.deposit;
    const total = location.state?.total;

    // Đếm ngược mỗi giây
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // Format số giây sang kiểu MM:SS (ví dụ 14:59)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    if (!payload) {
        return (
            <div className="text-center py-20">
                <p>Lỗi: Không tìm thấy thông tin thanh toán.</p>
                <button onClick={() => navigate("/")} className="mt-4 text-blue-600 underline">Về trang chủ</button>
            </div>
        );
    }

    const amountToPay = payload.paymentMethod === "deposit" ? deposit : total;

    const handleConfirmPayment = async (isAuto = false) => {
        setLoading(true);
        try {
            const res = await api.post("/bookings", payload);

            if (tab === "card") {
                const vnpayRes = await api.post("/vnpay/create-url", {
                    amount: amountToPay,
                    orderId: res.data.id
                });
                window.location.href = vnpayRes.data.paymentUrl;
                return;
            }

            toast.success(isAuto && tab === "transfer" ? "Chuyển khoản thành công!" : "Thanh toán & Đặt sân thành công!");
            navigate("/my-bookings", {
                state: {
                    successId: res.data.id,
                    paymentMethod: payload.paymentMethod,
                    payload,
                    isAutoTransfer: isAuto && tab === "transfer"
                }
            });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Thanh toán thất bại");
            setLoading(false);
        }
    };

    // Cấu hình Ngân hàng
    const BANK_ID = "MB"; 
    const ACCOUNT_NO = "5510355155442";
    const ACCOUNT_NAME = "NGUYEN THANH TU";
    const addInfo = `DATSAN ${payload.customer?.phone || ""}`;
    const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    return (
        <div className="max-w-xl mx-auto py-16 px-4">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 mb-6 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
            </button>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white">
                    <h2 className="text-2xl font-extrabold mb-2">Cổng Thanh Toán</h2>
                    <p className="text-blue-100 text-sm">Vui lòng chọn phương thức thanh toán phía dưới</p>
                    <div className="mt-6 inline-flex bg-white/20 p-4 rounded-2xl items-center">
                        <span className="text-lg mr-2 font-medium">Số tiền:</span>
                        <span className="text-3xl font-black">{formatCurrency(amountToPay)}</span>
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6">
                        <button
                            onClick={() => setTab("momo")}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition ${tab === "momo" ? "bg-white text-pink-600 shadow" : "text-gray-500 hover:text-gray-700"}`}>
                            <Smartphone className="w-4 h-4 mr-2" />
                            MoMo
                        </button>
                        <button
                            onClick={() => setTab("card")}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition ${tab === "card" ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-gray-700"}`}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Thẻ Băng/ATM
                        </button>
                        <button
                            onClick={() => setTab("transfer")}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center transition ${tab === "transfer" ? "bg-white text-indigo-600 shadow" : "text-gray-500 hover:text-gray-700"}`}>
                            <QrCode className="w-4 h-4 mr-2" />
                            Chuyển khoản
                        </button>
                    </div>

                    {tab === "momo" && (
                        <div className="border border-pink-200 rounded-2xl p-6 bg-pink-50/50 text-center mb-6">
                            <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" alt="MoMo" className="h-10 mx-auto mb-4" />
                            <p className="font-bold text-gray-800 mb-2">Quét mã MoMo</p>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-48 h-48 mx-auto flex items-center justify-center mb-4">
                                <img onClick={() => handleConfirmPayment(true)} src={`https://quickchart.io/qr?text=MOMO-${amountToPay}-${payload.customer?.phone}&size=200&ecLevel=H`} alt="Momo QR" className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity" title="Nhấn vào mã QR sau khi thanh toán để giả lập thành công" />
                            </div>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                Mở ứng dụng MoMo trên điện thoại và dùng tính năng Quét mã để thanh toán.
                            </p>
                        </div>
                    )}

                    {tab === "card" && (
                        <div className="border border-blue-200 rounded-2xl p-6 bg-blue-50/40 mb-6 text-center">
                            <div className="mb-4 text-center">
                                <CreditCard className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                            </div>
                            <h3 className="font-extrabold text-blue-800 text-lg mb-2">Thanh toán an toàn qua VNPAY</h3>
                            <p className="text-sm text-gray-600 max-w-sm mx-auto">
                                Cổng thanh toán quốc gia VNPAY hỗ trợ thẻ ATM nội địa, Visa, MasterCard và JCB.
                            </p>
                        </div>
                    )}

                    {tab === "transfer" && (
                        <div className="border border-dashed border-indigo-300 rounded-2xl p-6 bg-indigo-50/40 text-center mb-6">
                            <QrCode className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                            <p className="font-bold text-gray-800 mb-2">Chuyển khoản Ngân hàng</p>
                            <div className="text-sm text-gray-600 mb-4 space-y-2 text-left bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-sm mx-auto">
                                <div className="flex justify-between border-b border-gray-100 pb-2"><span>Ngân hàng:</span> <span className="font-bold text-gray-800 uppercase">{BANK_ID}</span></div>
                                <div className="flex justify-between border-b border-gray-100 pb-2 pt-1"><span>Số TK:</span> <span className="font-bold text-gray-800">{ACCOUNT_NO}</span></div>
                                <div className="flex justify-between pt-1"><span>Nội dung:</span> <span className="font-medium text-gray-800">{addInfo}</span></div>
                            </div>
                            <div className="w-56 h-56 mx-auto bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center p-2 relative shadow-sm">
                                <img onClick={() => handleConfirmPayment(true)} src={vietQrUrl} alt="qr chuyển khoản" className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity" title="Nhấn vào mã QR sau khi chuyển khoản để giả lập thành công" />
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-amber-600 mb-4 text-center font-medium bg-amber-50 rounded-lg p-2 max-w-sm mx-auto">
                        * MoMo/Chuyển khoản (Sandbox) giả lập giao dịch.<br /> Vui lòng <b>nhấn trực tiếp vào mã QR</b> để xác nhận đã thanh toán xong.<br />
                        * VNPAY sẽ chuyển sang trang VNPay test. Vui lòng nhập thẻ test của VNPAY.
                    </p>

                    {tab === "card" ? (
                        <button
                            onClick={() => handleConfirmPayment(false)}
                            disabled={loading}
                            className="w-full max-w-sm mx-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center py-4 rounded-xl font-bold transition disabled:opacity-60 shadow-md"
                        >
                            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                            Chuyển tới VNPAY
                        </button>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-xl max-w-sm mx-auto border border-blue-100">
                            <Loader2 className="w-5 h-5 animate-spin mb-2" />
                            <span className="font-medium text-sm text-center">
                                Hệ thống đang tự động chờ nhận tiền... <br/>
                                (Hết hạn thanh toán sau: <b className="text-red-600">{formatTime(timeLeft)}</b>)
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}