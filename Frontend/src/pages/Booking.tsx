import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  CalendarDays, Clock, MapPin, User, CheckCircle2, Loader2, Wallet, QrCode, Tag, Banknote, ChevronRight, ShieldCheck, Sparkles, ArrowLeft
} from "lucide-react";
import {
  api, Court, Field, formatCurrency, TIME_SLOTS, getBookedSlots, isSlotConflict,
} from "../lib/api";
import { getUser, isLoggedIn } from "../lib/auth";

const DURATIONS = [
  { label: "1 giờ", value: 1 },
  { label: "1.5 giờ", value: 1.5 },
  { label: "2 giờ", value: 2 },
];

const CLOSING_TIME = 22; // Sân đóng cửa lúc 22:00

export default function Booking() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fieldIdParam = params.get("fieldId");
  const courtIdParam = params.get("courtId");
  const dateParam = params.get("date");
  const timeParam = params.get("time");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const location = useLocation();
  const [success, setSuccess] = useState<null | { code: string; paymentMethod: string; checkinQrUrl?: string }>(null);

  const [field, setField] = useState<Field | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtId, setCourtId] = useState<number | null>(
    courtIdParam ? Number(courtIdParam) : null
  );
  const [date, setDate] = useState(dateParam || "");
  const [time, setTime] = useState(timeParam || "");
  const [duration, setDuration] = useState(1);
  const [customer, setCustomer] = useState({
    fullName: getUser()?.fullName || "",
    phone: getUser()?.phone || "",
    note: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"deposit" | "full" | "cash">("deposit");
  const [bookedSlots, setBookedSlots] = useState<Awaited<ReturnType<typeof getBookedSlots>>>([]);

  const [endDate, setEndDate] = useState("");
  
  // State dịch vụ đi kèm
  const [balls, setBalls] = useState(0);
  const [bibs, setBibs] = useState(0);
  const [water, setWater] = useState(0);         // Nước lọc
  const [mineralWater, setMineralWater] = useState(0); // Nước muối khoáng

  // Helper tính thời gian kết thúc
  const getEndTime = (startTime: string, dur: number): number => {
    const [hours, minutes] = startTime.split(":").map(Number);
    return hours + minutes / 60 + dur;
  };

  // Kiểm tra thời lượng thuê có vượt quá giờ đóng cửa (22:00) hay không
  const isDurationValid = (dur: number): boolean => {
    if (!time) return true;
    return getEndTime(time, dur) <= CLOSING_TIME;
  };

  // Tự động điều chỉnh thời lượng về 1 giờ nếu chuyển sang giờ muộn
  useEffect(() => {
    if (time && !isDurationValid(duration)) {
      const validOption = DURATIONS.find((d) => isDurationValid(d.value));
      if (validOption) {
        setDuration(validOption.value);
      }
    }
  }, [time]);

  const recurringDates = useMemo(() => {
    if (!date) return [];
    const dates = [date];
    if (endDate && endDate >= date) {
      let current = new Date(date);
      const end = new Date(endDate);
      while (true) {
        current.setDate(current.getDate() + 7);
        if (current > end) break;
        dates.push(current.toISOString().slice(0, 10));
      }
    }
    return dates;
  }, [date, endDate]);

  // Tính tổng tiền các dịch vụ phát sinh
  const servicesTotal = (balls * 20000) + (bibs * 10000) + (water * 10000) + (mineralWater * 15000);

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number; voucherId: number } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  useEffect(() => {
    if (!fieldIdParam) return;
    (async () => {
      try {
        const [fRes, cRes] = await Promise.all([
          api.get<Field>(`/fields/${fieldIdParam}`),
          api.get<Court[]>(`/courts`, { params: { fieldId: fieldIdParam } }),
        ]);
        setField(fRes.data);
        setCourts(cRes.data);
        if (!courtIdParam && cRes.data[0]) {
          setCourtId(cRes.data[0].id);
        }
      } catch {
        toast.error("Không tìm thấy cơ sở");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [fieldIdParam, courtIdParam]);

  const selectedCourt = courts.find((c) => c.id === courtId);

  useEffect(() => {
    if (!selectedCourt || !date) return;
    (async () => {
      try {
        const slots = await getBookedSlots(selectedCourt.id, date);
        setBookedSlots(slots);
      } catch {
        setBookedSlots([]);
      }
    })();
  }, [selectedCourt?.id, date]);

  const slotDisabled = (slot: string) => {
    return bookedSlots.some((b) =>
      isSlotConflict(b.time, b.duration, slot, duration)
    );
  };

  const courtPrice = selectedCourt?.price ?? field?.pricePerHour ?? 0;
  const subTotal = courtPrice * duration * recurringDates.length + servicesTotal;
  const discount = appliedVoucher?.discountAmount || 0;
  const total = Math.max(0, subTotal - discount);
  const deposit = Math.round(total * 0.3);

  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("Vui lòng nhập mã khuyến mãi");
      return;
    }
    setVoucherLoading(true);
    try {
      const res = await api.get(`/vouchers?code=${voucherCode.trim()}`);
      if (!res.data || res.data.length === 0) {
        toast.error("Mã khuyến mãi không tồn tại!");
        setVoucherLoading(false);
        return;
      }

      const voucher = res.data[0];
      const now = new Date().toISOString().slice(0, 10);

      if (voucher.validUntil && voucher.validUntil < now) {
        toast.error("Mã khuyến mãi đã hết hạn sử dụng!");
        setVoucherLoading(false);
        return;
      }

      if (voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
        toast.error("Mã khuyến mãi đã hết lượt sử dụng!");
        setVoucherLoading(false);
        return;
      }

      let discountAmount = 0;
      if (voucher.discountPercent) {
        discountAmount = Math.round((subTotal * voucher.discountPercent) / 100);
      } else if (voucher.discountAmount) {
        discountAmount = voucher.discountAmount;
      }

      discountAmount = Math.min(discountAmount, subTotal);

      setAppliedVoucher({
        code: voucher.code,
        discountAmount,
        voucherId: voucher.id,
      });

      toast.success(`Đã áp dụng mã ${voucher.code}: Giảm ${formatCurrency(discountAmount)}`);
    } catch {
      toast.error("Lỗi khi kiểm tra mã khuyến mãi");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCustomerChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedCourt || !field) {
      toast.error("Vui lòng chọn sân trước khi tiếp tục");
      return;
    }
    if (!date) {
      toast.error("Vui lòng chọn ngày đặt sân");
      return;
    }
    if (!time) {
      toast.error("Vui lòng chọn giờ đặt sân");
      return;
    }
    if (!isDurationValid(duration)) {
      toast.error("Thời lượng đặt sân vượt quá giờ đóng cửa (22:00)");
      return;
    }
    if (!customer.fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên");
      return;
    }
    if (!customer.phone.trim() || customer.phone.trim().length < 9) {
      toast.error("Số điện thoại không hợp lệ");
      return;
    }
    if (slotDisabled(time)) {
      toast.error("Khung giờ này đã có người đặt. Vui lòng chọn giờ khác.");
      return;
    }

    const user = getUser();
    setLoading(true);

    try {
      for (const d of recurringDates) {
        const slots = await getBookedSlots(selectedCourt.id, d);
        if (slots.some((b) => isSlotConflict(b.time, b.duration, time, duration))) {
          toast.error(`Khung giờ ngày ${d} vừa được đặt. Vui lòng chọn giờ khác.`);
          if (d === date) setBookedSlots(slots);
          setLoading(false);
          return;
        }
      }
    } catch {
      toast.error("Lỗi khi kiểm tra lịch trống.");
      setLoading(false);
      return;
    }

    const services = [];
    if (balls > 0) services.push({ name: "Bóng rổ", quantity: balls, price: 20000 });
    if (bibs > 0) services.push({ name: "Áo pitch", quantity: bibs, price: 10000 });
    if (water > 0) services.push({ name: "Nước lọc", quantity: water, price: 10000 });
    if (mineralWater > 0) services.push({ name: "Nước muối khoáng", quantity: mineralWater, price: 15000 });

    const getPaymentStatus = () => {
      if (paymentMethod === "full") return "paid";
      if (paymentMethod === "deposit") return "deposit_paid";
      return "unpaid";
    };

    const payload = {
      fieldId: field.id,
      courtId: selectedCourt.id,
      fieldName: field.name,
      court: selectedCourt.name,
      date,
      recurringDates,
      time,
      duration,
      total,
      customer: {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        note: customer.note.trim(),
        userId: user?.id,
        email: user?.email,
      },
      services,
      paymentMethod,
      paymentStatus: getPaymentStatus(),
      status: "pending",
      voucherCode: appliedVoucher?.code || "",
      discount: appliedVoucher?.discountAmount || 0,
      createdAt: new Date().toISOString(),
    };

    if (paymentMethod === "cash") {
      try {
        const res = await api.post("/bookings", payload);
        const code = `BK${String(res.data.id).padStart(6, "0")}`;
        const qrData = `CHECKIN-${code} | Sân: ${payload.fieldName} - ${payload.court} | Tên: ${payload.customer.fullName} | ĐT: ${payload.customer.phone}`;
        const checkinQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=250`;

        setSuccess({
          code,
          paymentMethod: "cash",
          checkinQrUrl,
        });
        toast.success("Đặt sân thành công!");
      } catch {
        toast.error("Tạo đơn đặt sân thất bại. Vui lòng thử lại!");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(false);
    navigate("/paygate", { state: { payload, deposit, total } });
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-3 bg-black min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
        <p className="text-gray-400 text-sm font-medium">Đang chuẩn bị trang đặt sân...</p>
      </div>
    );
  }

  if (!fieldIdParam || !field) {
    return (
      <div className="max-w-lg mx-auto py-24 px-4 text-center">
        <div className="text-6xl mb-4 opacity-80">🏀</div>
        <h2 className="text-2xl font-bold text-white mb-2">Chưa chọn cơ sở thể thao</h2>
        <p className="text-gray-400 mb-6">Vui lòng chọn sân trước khi thực hiện đặt lịch.</p>
        <Link to="/fields" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl">
          Tìm sân ngay →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="bg-zinc-900 rounded-3xl border border-yellow-500/30 p-8 md:p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mx-auto mb-5 text-yellow-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-extrabold text-white mb-2">
            {location.state?.isAutoTransfer ? "Chuyển khoản thành công!" : "Đặt sân thành công!"}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Mã đơn của bạn: <span className="font-extrabold text-yellow-400 text-base">{success.code}</span>
          </p>

          <div className="bg-black/80 border border-white/10 rounded-2xl p-5 mb-8">
            {success.checkinQrUrl ? (
              <img src={success.checkinQrUrl} alt="Check-in QR" className="w-44 h-44 mx-auto object-contain rounded-xl bg-white p-2" />
            ) : (
              <QrCode className="w-40 h-40 mx-auto text-yellow-500" />
            )}
            <p className="text-xs text-gray-400 mt-3 font-medium">
              Vui lòng xuất trình mã QR này khi check-in tại quầy lễ tân sân bóng.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/my-bookings"
              className="btn-primary block w-full py-3.5 rounded-xl font-bold"
            >
              Xem đơn đặt sân của tôi
            </Link>
            <Link
              to="/"
              className="btn-outline block w-full py-3 rounded-xl text-sm"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 tracking-wide uppercase font-bold">
          <Link to="/" className="hover:text-yellow-400 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/detail/${field.id}`} className="hover:text-yellow-400 transition-colors">{field.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-yellow-500">Đặt lịch thi đấu</span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Chọn sân */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="text-lg font-extrabold text-white mb-2 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">1</span>
                Chọn sân đấu
              </h3>
              <p className="text-sm text-gray-400 mb-6 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                {field.name} · {field.address}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {courts.map((c) => {
                  const active = courtId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCourtId(c.id)}
                      className={`rounded-2xl p-4 text-left transition-all relative overflow-hidden border ${
                        active
                          ? "bg-yellow-500/10 border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/10 ring-1 ring-yellow-500/50"
                          : "bg-black border-white/10 text-gray-300 hover:border-yellow-500/40"
                      }`}
                    >
                      <div className="font-bold text-sm text-white mb-1 flex items-center justify-between">
                        {c.name}
                        {active && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                      </div>
                      <div className={`text-xs font-semibold ${active ? "text-yellow-400" : "text-gray-400"}`}>
                        {formatCurrency(c.price)} / giờ
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Ngày & Giờ */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="text-lg font-extrabold text-white mb-6 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">2</span>
                Thời gian đặt sân
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate("");
                      setTime("");
                    }}
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Đến ngày (tùy chọn đặt cố định tuần)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={date || new Date().toISOString().slice(0, 10)}
                    max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 10)}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>

              {/* Khung giờ */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Chọn khung giờ bắt đầu
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {TIME_SLOTS.map((t) => {
                    const disabled = !date || slotDisabled(t);
                    const selected = time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={disabled}
                        onClick={() => setTime(t)}
                        className={`rounded-xl py-2.5 text-xs font-bold transition-all border ${
                          selected
                            ? "bg-yellow-500 text-black border-yellow-500 shadow-md shadow-yellow-500/30 scale-105"
                            : disabled
                            ? "bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed"
                            : "bg-black text-gray-300 border-white/10 hover:border-yellow-500 hover:text-yellow-400"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thời lượng */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Thời lượng thuê
                </label>
                <div className="flex gap-3">
                  {DURATIONS.map((d) => {
                    const disabled = !time || !isDurationValid(d.value);
                    const active = duration === d.value && !disabled;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => setDuration(d.value)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          active
                            ? "bg-yellow-500 text-black border-yellow-500"
                            : disabled
                            ? "bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed opacity-50"
                            : "bg-black text-gray-300 border-white/10 hover:border-yellow-500 hover:text-yellow-400"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {time && getEndTime(time, 1) >= CLOSING_TIME && (
                  <p className="text-xs text-yellow-500/80 mt-2 font-medium">
                    * Sân đóng cửa lúc {CLOSING_TIME}:00 nên chỉ áp dụng thời lượng phù hợp.
                  </p>
                )}
              </div>
            </div>

            {/* 3. Dịch vụ tiện ích */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="text-lg font-extrabold text-white mb-6 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">3</span>
                Dịch vụ & Dụng cụ thêm
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "Thuê bóng thi đấu", price: "20.000đ / quả", val: balls, set: setBalls },
                  { name: "Thuê áo pitch chia đội", price: "10.000đ / áo", val: bibs, set: setBibs },
                  { name: "Nước khoáng lạnh", price: "10.000đ / chai", val: water, set: setWater },
                  { name: "Nước muối điện giải", price: "15.000đ / chai", val: mineralWater, set: setMineralWater },
                ].map((s, idx) => (
                  <div key={idx} className="bg-black border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{s.name}</div>
                      <div className="text-xs text-yellow-500 font-semibold mt-0.5">{s.price}</div>
                    </div>
                    <div className="flex items-center space-x-3 bg-zinc-900 border border-white/10 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => s.set(Math.max(0, s.val - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 font-bold transition-all"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-white text-sm min-w-[18px] text-center">{s.val}</span>
                      <button
                        type="button"
                        onClick={() => s.set(s.val + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-yellow-400 hover:bg-yellow-500/20 font-bold transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Thông tin người đặt */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="text-lg font-extrabold text-white mb-6 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">4</span>
                Thông tin liên hệ
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Họ và tên *</label>
                  <input
                    name="fullName"
                    value={customer.fullName}
                    onChange={handleCustomerChange}
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-600"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số điện thoại *</label>
                  <input
                    name="phone"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-600"
                    placeholder="0987xxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ghi chú yêu cầu thêm</label>
                <textarea
                  name="note"
                  rows={2}
                  value={customer.note}
                  onChange={handleCustomerChange}
                  className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none placeholder:text-gray-600"
                  placeholder="Yêu cầu chuẩn bị sân, bóng mới..."
                />
              </div>
            </div>

            {/* 5. Phương thức thanh toán */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="text-lg font-extrabold text-white mb-6 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">5</span>
                Phương thức thanh toán
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: "deposit",
                    title: "Đặt cọc (30%)",
                    desc: "Chuyển khoản cọc giữ sân",
                    badge: "Phổ biến",
                  },
                  {
                    id: "full",
                    title: "Thanh toán 100%",
                    desc: "Thẻ ATM, Visa, QR VNPay",
                    badge: "Nhanh nhất",
                  },
                  {
                    id: "cash",
                    title: "Tiền mặt tại sân",
                    desc: "Thanh toán trực tiếp khi đến",
                    badge: "Linh hoạt",
                  },
                ].map((item) => {
                  const active = paymentMethod === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`block rounded-2xl p-5 cursor-pointer border transition-all relative overflow-hidden ${
                        active
                          ? "bg-yellow-500/10 border-yellow-500 ring-1 ring-yellow-500/40"
                          : "bg-black border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={active}
                          onChange={() => setPaymentMethod(item.id as any)}
                          className="accent-yellow-500 w-4 h-4 mt-1"
                        />
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                          {item.badge}
                        </span>
                      </div>
                      <div className="font-bold text-white text-base mt-2">{item.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                    </label>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Sticky Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-zinc-900 rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center justify-between">
                  Tóm tắt đơn đặt
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </h3>

                <div className="space-y-4 mb-6 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400">Cơ sở</span>
                    <span className="text-white font-bold text-right max-w-[60%] line-clamp-1">{field.name}</span>
                  </div>

                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400">Sân đấu</span>
                    <span className="text-white font-bold">{selectedCourt?.name || "—"}</span>
                  </div>

                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-yellow-500" /> Ngày
                    </span>
                    <span className="text-white font-bold">
                      {date || "Chưa chọn"} {recurringDates.length > 1 && <span className="text-yellow-400 ml-1">({recurringDates.length} buổi)</span>}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-yellow-500" /> Giờ đá
                    </span>
                    <span className="text-white font-bold">{time || "Chưa chọn"} ({duration}h)</span>
                  </div>

                  {servicesTotal > 0 && (
                    <div className="flex justify-between border-b border-white/5 pb-3">
                      <span className="text-gray-400">Dịch vụ thêm</span>
                      <span className="text-white font-bold">{formatCurrency(servicesTotal)}</span>
                    </div>
                  )}

                  {/* Voucher code */}
                  <div className="pt-2 pb-3">
                    <div className="flex gap-2">
                      <input
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="MÃ GIẢM GIÁ..."
                        className="bg-black border border-white/10 rounded-xl px-4 py-2.5 w-full text-xs font-bold text-white outline-none focus:border-yellow-500 uppercase placeholder:text-gray-600"
                      />
                      <button
                        type="button"
                        onClick={applyVoucher}
                        disabled={voucherLoading || !subTotal}
                        className="btn-outline px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-40"
                      >
                        {voucherLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Áp dụng"}
                      </button>
                    </div>
                  </div>

                  {appliedVoucher && (
                    <div className="flex justify-between border-b border-white/5 pb-3 text-emerald-400">
                      <span className="flex items-center gap-1"><Tag size={14} /> Giảm giá voucher</span>
                      <span className="font-extrabold">-{formatCurrency(appliedVoucher.discountAmount)}</span>
                    </div>
                  )}

                  {paymentMethod === "deposit" && (
                    <div className="flex justify-between border-b border-white/5 pb-3 bg-yellow-500/5 px-3 py-2 rounded-xl">
                      <span className="text-yellow-400 font-bold">Tiền cọc trước (30%)</span>
                      <span className="text-yellow-400 font-extrabold text-base">{formatCurrency(deposit)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400 font-bold">Tổng thanh toán</span>
                    <span className="text-2xl font-black text-white">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 rounded-xl font-extrabold flex justify-center items-center gap-2 transition-all disabled:opacity-50 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : paymentMethod === "cash" ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Xác nhận đặt sân
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      Tiếp tục thanh toán →
                    </>
                  )}
                </button>

                <div className="mt-6 pt-6 border-t border-white/5 space-y-2.5 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-yellow-500 shrink-0" />
                    Bảo mật giao dịch 100% qua cổng kiểm duyệt
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                    Hủy lịch miễn phí trước 2 tiếng thi đấu
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}