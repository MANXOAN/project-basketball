import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  CalendarDays, Clock, MapPin, User, CheckCircle2, Loader2, Wallet, QrCode, Tag
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

const CLOSING_TIME = 21; // Sân đóng cửa lúc 21:00

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
  const [paymentMethod, setPaymentMethod] = useState<"deposit" | "full">("deposit");
  const [bookedSlots, setBookedSlots] = useState<Awaited<ReturnType<typeof getBookedSlots>>>([]);

  const [endDate, setEndDate] = useState("");
  const [balls, setBalls] = useState(0);
  const [bibs, setBibs] = useState(0);

  // Helper tính thời gian kết thúc dựa trên giờ bắt đầu và thời lượng thuê
  const getEndTime = (startTime: string, dur: number): number => {
    const [hours, minutes] = startTime.split(":").map(Number);
    return hours + minutes / 60 + dur;
  };

  // Kiểm tra thời lượng thuê có vượt quá giờ đóng cửa (21:00) hay không
  const isDurationValid = (dur: number): boolean => {
    if (!time) return true;
    return getEndTime(time, dur) <= CLOSING_TIME;
  };

  // Tự động điều chỉnh thời lượng về mức hợp lệ nhỏ nhất (1 giờ) nếu chuyển sang giờ muộn
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

  const servicesTotal = (balls * 20000) + (bibs * 10000);

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number; voucherId: number } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const selectedCourt = courts.find((c) => c.id === courtId) || null;
  const subTotal = useMemo(() => {
    let cost = 0;
    if (selectedCourt) {
      cost = selectedCourt.price * duration * recurringDates.length;
    }
    return cost + (servicesTotal * recurringDates.length);
  }, [selectedCourt, duration, recurringDates.length, servicesTotal]);

  const total = useMemo(
    () => Math.max(0, subTotal - (appliedVoucher?.discountAmount || 0)),
    [subTotal, appliedVoucher]
  );
  const deposit = total * 0.3; // 30% deposit

  useEffect(() => {
    if (!fieldIdParam) {
      setLoadingData(false);
      return;
    }
    (async () => {
      try {
        const [fRes, cRes] = await Promise.all([
          api.get<Field>(`/fields/${fieldIdParam}`),
          api.get<Court[]>(`/courts`, { params: { fieldId: fieldIdParam, status: "active" } }),
        ]);
        setField(fRes.data);
        const active = cRes.data.filter((c) => c.status === "active");
        setCourts(active);
        if (!courtId && active.length) setCourtId(active[0].id);
      } catch {
        toast.error("Không tải được thông tin sân");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [fieldIdParam]);

  useEffect(() => {
    if (!courtId || !date) {
      setBookedSlots([]);
      return;
    }
    getBookedSlots(courtId, date).then(setBookedSlots).catch(() => setBookedSlots([]));
  }, [courtId, date]);

  useEffect(() => {
    if (location.state?.successId) {
      const code = `BK${String(location.state.successId).padStart(6, "0")}`;

      const payload = location.state.payload;
      let qrData = `CHECKIN-${code}`;
      if (payload) {
        qrData += ` | Sân: ${payload.fieldName} - ${payload.court} | Tên: ${payload.customer.fullName} | ĐT: ${payload.customer.phone}`;
      }

      const checkinQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=250`;
      setSuccess({
        code,
        paymentMethod: location.state.paymentMethod,
        checkinQrUrl
      });
      // prevent infinite loop by clearing state
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, location.search]);

  const slotDisabled = (slot: string) => {
    const isPast = date === new Date().toISOString().slice(0, 10) && new Date(`${date}T${slot}:00`) < new Date();
    return isPast || bookedSlots.some((b) => isSlotConflict(b.time, b.duration, slot, duration));
  };

  const handleCustomerChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    try {
      const res = await api.get(`/vouchers`, { params: { code: voucherCode.trim().toUpperCase(), status: 'active' } });
      const vouchers = res.data;
      if (!vouchers || vouchers.length === 0) {
        toast.error("Mã giảm giá không hợp lệ hoặc không tồn tại!");
        setAppliedVoucher(null);
        return;
      }

      const v = vouchers[0];
      if (v.used >= v.limit) {
        toast.error("Mã giảm giá đã hết lượt sử dụng!");
        setAppliedVoucher(null);
        return;
      }

      let discountAmount = 0;
      if (v.type === 'percent') {
        discountAmount = (subTotal * v.discount) / 100;
      } else {
        discountAmount = v.discount;
      }

      setAppliedVoucher({
        code: v.code,
        discountAmount,
        voucherId: v.id
      });
      toast.success("Áp dụng mã hợp lệ!");
    } catch (e) {
      toast.error("Lỗi khi kiểm tra mã");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn()) {
      toast.error("Vui lòng đăng nhập để đặt sân");
      navigate("/login", { state: { from: `/booking?fieldId=${fieldIdParam}` } });
      return;
    }
    if (!field || !selectedCourt) {
      toast.error("Vui lòng chọn sân");
      return;
    }
    if (!date) {
      toast.error("Vui lòng chọn ngày đặt sân");
      return;
    }
    if (!time) {
      toast.error("Vui lòng chọn giờ");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      toast.error("Không thể đặt ngày trong quá khứ");
      return;
    }
    if (!customer.fullName.trim() || !customer.phone.trim()) {
      toast.error("Vui lòng nhập họ tên và số điện thoại");
      return;
    }
    if (!/^(0|\+84)[0-9]{9,10}$/.test(customer.phone.trim())) {
      toast.error("Số điện thoại không hợp lệ");
      return;
    }
    if (slotDisabled(time)) {
      toast.error("Khung giờ này đã có người đặt. Vui lòng chọn giờ khác.");
      return;
    }

    const user = getUser();

    // Validate for all dates
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
    } catch (err) {
      toast.error("Lỗi khi kiểm tra lịch trống.");
      setLoading(false);
      return;
    }
    setLoading(false);

    const services = [];
    if (balls > 0) services.push({ name: "Bóng", quantity: balls, price: 20000 });
    if (bibs > 0) services.push({ name: "Áo pitch", quantity: bibs, price: 10000 });

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
      paymentStatus: paymentMethod === "deposit" ? "deposit_paid" : "paid",
      status: "pending",
      voucherCode: appliedVoucher?.code || "",
      discount: appliedVoucher?.discountAmount || 0,
      createdAt: new Date().toISOString(),
    };

    navigate("/paygate", { state: { payload, deposit, total } });
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!fieldIdParam || !field) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-gray-500 mb-4">Chưa chọn cơ sở để đặt sân</p>
        <Link to="/fields" className="text-blue-600 font-bold">
          Tìm sân ngay →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            {location.state?.isAutoTransfer ? "Chuyển khoản thành công!" : "Đặt sân thành công!"}
          </h2>
          <p className="text-gray-500 mb-4">
            Mã đơn: <span className="font-bold text-green-700">{success.code}</span>
          </p>
          {paymentMethod === "full" ? (
            <p className="text-sm text-green-600 mb-6">Đã thanh toán 100% · Cần admin xác nhận</p>
          ) : (
            <p className="text-sm text-amber-600 mb-6">Đã đặt cọc 30% · Cần admin xác nhận</p>
          )}
          {success.checkinQrUrl ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 inline-block w-full text-center">
              <img src={success.checkinQrUrl} alt="Check-in QR" className="w-40 h-40 mx-auto object-contain" />
              <p className="text-xs text-gray-500 mt-2">Mã QR Check-in / Xác minh tại sân</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 inline-block w-full text-center">
              <QrCode className="w-40 h-40 mx-auto text-gray-800" />
              <p className="text-xs text-gray-500 mt-2">Mã QR Check-in / Xác minh tại sân</p>
            </div>
          )}
          <div className="space-y-3">
            <Link
              to="/my-bookings"
              className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
            >
              Xem đơn của tôi
            </Link>
            <Link to="/" className="block w-full border border-gray-200 py-3 rounded-xl font-bold text-gray-600">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-sm text-gray-400 mb-6">
        <Link to="/" className="text-blue-600">Trang chủ</Link> /{" "}
        <Link to={`/detail/${field.id}`} className="text-blue-600">
          {field.name}
        </Link>{" "}
        / <span className="text-gray-600">Đặt sân</span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-blue-600" /> Chọn sân
            </h3>
            <p className="text-sm text-gray-500 mb-4">{field.name} · {field.address}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {courts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCourtId(c.id)}
                  className={`border rounded-xl px-4 py-3 text-sm font-bold transition ${courtId === c.id
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-200 text-gray-700 hover:border-blue-400"
                    }`}
                >
                  {c.name}
                  <div className={`text-xs mt-1 font-medium ${courtId === c.id ? "text-blue-100" : "text-gray-400"}`}>
                    {formatCurrency(c.price)}/h
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center">
              <CalendarDays className="w-4 h-4 mr-2 text-blue-600" /> Ngày & giờ
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate("");
                    setTime("");
                  }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Đến ngày (tối đa 3 tháng)</label>
                <input
                  type="date"
                  value={endDate}
                  min={date || new Date().toISOString().slice(0, 10)}
                  max={new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 10)}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-2">Khung giờ</label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map((t) => {
                  const disabled = !date || slotDisabled(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTime(t)}
                      className={`rounded-lg py-2 text-xs font-bold border transition ${time === t
                        ? "bg-blue-600 border-blue-600 text-white"
                        : disabled
                          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                          : "border-gray-200 text-gray-700 hover:border-blue-400"
                        }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Thời lượng</label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => {
                  const disabled = !time || !isDurationValid(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDuration(d.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${duration === d.value && !disabled
                        ? "bg-blue-600 border-blue-600 text-white"
                        : disabled
                          ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-60"
                          : "border-gray-200 text-gray-600 hover:border-blue-400"
                        }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {time && getEndTime(time, 1) >= CLOSING_TIME && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  * Sân đóng cửa lúc {CLOSING_TIME}:00 nên khung giờ này chỉ có thể đặt tối đa 1 giờ.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center">
              <User className="w-4 h-4 mr-2 text-blue-600" /> Thông tin liên hệ
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Họ và tên</label>
                <input
                  name="fullName"
                  value={customer.fullName}
                  onChange={handleCustomerChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Số điện thoại</label>
                <input
                  name="phone"
                  value={customer.phone}
                  onChange={handleCustomerChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  placeholder="09xxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Ghi chú</label>
                <textarea
                  name="note"
                  rows={3}
                  value={customer.note}
                  onChange={handleCustomerChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
                  placeholder="Yêu cầu thêm..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center">
              <Tag className="w-4 h-4 mr-2 text-blue-600" /> Dịch vụ thêm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-gray-50/50">
                <div>
                  <div className="font-bold text-gray-800 text-sm">Thuê bóng</div>
                  <div className="text-xs text-blue-600 font-semibold">20.000đ / quả / buổi</div>
                </div>
                <div className="flex items-center space-x-3">
                  <button type="button" onClick={() => setBalls(Math.max(0, balls - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-100">-</button>
                  <span className="font-bold min-w-[20px] text-center">{balls}</span>
                  <button type="button" onClick={() => setBalls(balls + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-100">+</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-gray-50/50">
                <div>
                  <div className="font-bold text-gray-800 text-sm">Thuê áo pit (bib)</div>
                  <div className="text-xs text-blue-600 font-semibold">10.000đ / áo / buổi</div>
                </div>
                <div className="flex items-center space-x-3">
                  <button type="button" onClick={() => setBibs(Math.max(0, bibs - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-100">-</button>
                  <span className="font-bold min-w-[20px] text-center">{bibs}</span>
                  <button type="button" onClick={() => setBibs(bibs + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 font-bold hover:bg-gray-100">+</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center">
              <Wallet className="w-4 h-4 mr-2 text-blue-600" /> Phương thức thanh toán
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`block border rounded-xl p-4 cursor-pointer transition ${paymentMethod === "deposit" ? "border-blue-600 bg-blue-50/50" : "border-gray-200"
                  }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "deposit"}
                    onChange={() => {
                      setPaymentMethod("deposit");
                    }}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <div className="font-bold text-gray-800 text-sm">Đặt cọc (30%)</div>
                    <div className="text-xs text-gray-500">Thanh toán chuyển khoản cọc</div>
                  </div>
                </div>
              </label>
              <label
                className={`block border rounded-xl p-4 cursor-pointer transition ${paymentMethod === "full" ? "border-blue-600 bg-blue-50/50" : "border-gray-200"
                  }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "full"}
                    onChange={() => {
                      setPaymentMethod("full");
                    }}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <div className="font-bold text-gray-800 text-sm">Thanh toán toàn bộ (100%)</div>
                    <div className="text-xs text-gray-500">Chuyển khoản toàn bộ, không cần trả sau</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
              <h3 className="font-extrabold text-gray-900 mb-6">Tóm tắt đơn</h3>
              <div className="space-y-4 mb-8 text-sm font-semibold">
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500">Cơ sở</span>
                  <span className="text-gray-900 text-right max-w-[60%]">{field.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500">Sân</span>
                  <span className="text-gray-900">{selectedCourt?.name || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 flex items-center">
                    <CalendarDays className="w-3.5 h-3.5 mr-1" /> Ngày
                  </span>
                  <span>{date || "Chưa chọn"} {recurringDates.length > 1 && <span className="text-xs text-blue-600 ml-1">({recurringDates.length} buổi)</span>}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Giờ
                  </span>
                  <span>{time || "Chưa chọn"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500">Thời lượng</span>
                  <span>{duration} giờ</span>
                </div>

                <div className="flex justify-between pb-2 pt-2">
                  <div className="flex w-full space-x-2">
                    <input
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Mã giảm giá..."
                      className="border border-gray-200 rounded-xl px-4 py-2 w-full text-sm font-bold text-gray-700 outline-none focus:border-blue-500 uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      disabled={voucherLoading || !subTotal}
                      className="bg-gray-800 hover:bg-gray-900 transition-colors text-white px-5 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-50 flex items-center justify-center"
                    >
                      {voucherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
                    </button>
                  </div>
                </div>

                {appliedVoucher && (
                  <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 flex items-center gap-1"><Tag size={14} /> Giảm giá</span>
                    <span className="text-emerald-500 font-black">-{formatCurrency(appliedVoucher.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between border-b border-gray-100 pb-3 pt-2">
                  <span className="text-gray-500">Tiền cọc (30%)</span>
                  <span className="text-amber-500 font-bold">{formatCurrency(deposit)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Tổng tiền</span>
                  <span className="text-blue-600 text-lg font-extrabold">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex justify-center items-center transition disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="w-5 h-5 mr-2" />
                )}
                {loading
                  ? "Đang xử lý..."
                  : "Thanh toán online (Paygate)"}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full mt-3 border border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}