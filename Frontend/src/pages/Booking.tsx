import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CalendarDays, Clock, MapPin, CheckCircle2, Loader2, Wallet, QrCode, Tag, ChevronRight, ShieldCheck, Sparkles, ArrowLeft, Plus, Trash2, Pencil, X
} from "lucide-react";
import {
  api, Court, Field, formatCurrency, getBookedSlots, invalidateApiCache, isSlotConflict,
} from "../lib/api";
import { getUser } from "../lib/auth";
import { isPastVietnamSlot, vietnamTodayIso } from "../lib/bookingTime";

const DURATIONS = [
  { label: "1 giờ", value: 1 },
  { label: "1.5 giờ", value: 1.5 },
  { label: "2 giờ", value: 2 },
];
type ScheduleSegment = { id: number; startDate: string; endDate: string; time: string };
type BookingMode = "court" | "full_field";
type RecurrencePreset = "single" | "daily" | "weekly" | "monthly";
type ScheduleOccurrence = { date: string; time: string; duration?: number };
type AvailabilityConflict = Required<ScheduleOccurrence> & { suggestions: string[] };
type OccurrenceOverride = { date: string; time: string; duration: number };

type BookingDraft = {
  fieldId?: number;
  courtId?: number;
  date?: string;
  recurringDates?: string[];
  occurrences?: ScheduleOccurrence[];
  scheduleSegments?: Array<Omit<ScheduleSegment, "id">>;
  bookingMode?: BookingMode;
  time?: string;
  duration?: number;
  customer?: { fullName?: string; phone?: string; note?: string };
  services?: Array<{ name?: string; quantity?: number }>;
  paymentMethod?: PaymentMethod;
  voucherCode?: string;
};

type PaymentMethod = "deposit" | "full" | "cash";

const addDaysIso = (value: string, days: number): string => {
  const next = new Date(value + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const monthPlanEndIso = (value: string): string => addDaysIso(value, 29);

const getEndTime = (startTime: string, dur: number): number => {
  const [hours, minutes] = startTime.split(":").map(Number);
  return hours + minutes / 60 + dur;
};

export default function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDraft = (location.state as { bookingDraft?: BookingDraft } | null)?.bookingDraft;
  const draftServiceQuantity = (name: string) => Number(
    bookingDraft?.services?.find((service) => service.name === name)?.quantity || 0
  );
  const [params] = useSearchParams();
  const fieldIdParam = params.get("fieldId");
  const courtIdParam = params.get("courtId");
  const dateParam = params.get("date");
  const timeParam = params.get("time");

  const [loading, setLoading] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState<null | { code: string; paymentMethod: string; checkinQrUrl?: string }>(null);

  const [field, setField] = useState<Field | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtId, setCourtId] = useState<number | null>(
    bookingDraft?.courtId || (courtIdParam ? Number(courtIdParam) : null)
  );
  const [bookingMode, setBookingMode] = useState<BookingMode>(bookingDraft?.bookingMode || "court");
  const [date, setDate] = useState(bookingDraft?.occurrences?.[0]?.date || bookingDraft?.date || dateParam || "");
  const [time, setTime] = useState(bookingDraft?.occurrences?.[0]?.time || bookingDraft?.time || timeParam || "");
  const [duration, setDuration] = useState(Number(bookingDraft?.duration || 1));
  const [customer, setCustomer] = useState({
    fullName: bookingDraft?.customer?.fullName || getUser()?.fullName || "",
    phone: bookingDraft?.customer?.phone || getUser()?.phone || "",
    note: bookingDraft?.customer?.note || "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(bookingDraft?.paymentMethod || null);
  const [paymentError, setPaymentError] = useState("");
  const [bookedSlots, setBookedSlots] = useState<Awaited<ReturnType<typeof getBookedSlots>>>([]);
  const todayIso = vietnamTodayIso(clockNow);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>(bookingDraft?.occurrences?.length ? "single" : bookingDraft?.recurringDates?.length ? "weekly" : "single");
  const [endDate, setEndDate] = useState(
    bookingDraft?.occurrences?.length ? "" : bookingDraft?.scheduleSegments?.[0]?.endDate || (bookingDraft?.recurringDates?.length ? bookingDraft.recurringDates[bookingDraft.recurringDates.length - 1] || "" : "")
  );
  const [occurrenceOverrides, setOccurrenceOverrides] = useState<Record<string, OccurrenceOverride | null>>({});
  const [editingOccurrence, setEditingOccurrence] = useState<(OccurrenceOverride & { sourceKey: string }) | null>(null);
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const [availabilityConflicts, setAvailabilityConflicts] = useState<AvailabilityConflict[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const conflictSummaryRef = useRef<HTMLDivElement>(null);
  const [schedulePeriods, setSchedulePeriods] = useState<ScheduleSegment[]>(() =>
    (bookingDraft?.occurrences?.length ? bookingDraft.occurrences.slice(1).map((occurrence) => ({ startDate: occurrence.date, endDate: occurrence.date, time: occurrence.time })) : (bookingDraft?.scheduleSegments || []).slice(1)).map((segment, index) => ({
      id: index + 1,
      startDate: segment.startDate || "",
      endDate: segment.endDate || segment.startDate || "",
      time: segment.time || "",
    }))
  );
  
  // State dịch vụ đi kèm
  const [balls, setBalls] = useState(draftServiceQuantity("Bóng rổ"));
  const [bibs, setBibs] = useState(draftServiceQuantity("Áo pitch"));
  const [water, setWater] = useState(draftServiceQuantity("Nước lọc"));
  const [mineralWater, setMineralWater] = useState(draftServiceQuantity("Nước muối khoáng"));

  const closingTime = Number((field?.closeTime || "22:00").split(":")[0]);
  const timeSlots = useMemo(() => {
    const [openHour, openMinute] = (field?.openTime || "06:00").split(":").map(Number);
    const [closeHour, closeMinute] = (field?.closeTime || "22:00").split(":").map(Number);
    const slots: string[] = [];
    for (let minute = openHour * 60 + openMinute; minute < closeHour * 60 + closeMinute; minute += 30) {
      slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
    return slots;
  }, [field?.openTime, field?.closeTime]);

  // Kiểm tra thời lượng thuê có vượt quá giờ đóng cửa của cơ sở đã chọn.
  const isDurationValid = useCallback((dur: number): boolean => {
    if (!time) return true;
    return getEndTime(time, dur) <= closingTime;
  }, [time, closingTime]);

  // Tự động điều chỉnh thời lượng về 1 giờ nếu chuyển sang giờ muộn
  useEffect(() => {
    if (time && !isDurationValid(duration)) {
      const validOption = DURATIONS.find((d) => isDurationValid(d.value));
      if (validOption) {
        setDuration(validOption.value);
      }
    }
  }, [time, duration, isDurationValid]);

  const scheduleSegments = useMemo(() => {
    const presetEndDate = recurrencePreset === "single" ? date : recurrencePreset === "monthly" ? (date ? monthPlanEndIso(date) : "") : endDate || date;
    const segments = date ? [{ startDate: date, endDate: presetEndDate, time }] : [];
    schedulePeriods.forEach((period) => {
      if (period.startDate && period.endDate && period.time) {
        segments.push({ startDate: period.startDate, endDate: period.endDate, time: period.time });
      }
    });
    return segments;
  }, [date, endDate, time, schedulePeriods, recurrencePreset]);

  const scheduledOccurrences = useMemo(() => {
    const seen = new Set<string>();
    return scheduleSegments.flatMap((segment) => {
      if (!segment.startDate || !segment.endDate || segment.endDate < segment.startDate || !segment.time) return [];
      const dates: Array<{ date: string; time: string }> = [];
      const current = new Date(segment.startDate + "T00:00:00Z");
      const end = new Date(segment.endDate + "T00:00:00Z");
      while (current <= end) {
        const occurrence = { date: current.toISOString().slice(0, 10), time: segment.time };
        const key = occurrence.date + "|" + occurrence.time;
        if (!seen.has(key)) {
          seen.add(key);
          dates.push(occurrence);
        }
        current.setUTCDate(current.getUTCDate() + (recurrencePreset === "daily" ? 1 : 7));
      }
      return dates;
    });
  }, [scheduleSegments, recurrencePreset]);

  const selectedOccurrences = useMemo(() => scheduledOccurrences.flatMap((occurrence) => {
    const sourceKey = occurrence.date + "|" + occurrence.time;
    const override = occurrenceOverrides[sourceKey];
    if (override === null) return [];
    return [{ sourceKey, date: override?.date || occurrence.date, time: override?.time || occurrence.time, duration: override?.duration ?? duration }];
  }), [scheduledOccurrences, occurrenceOverrides, duration]);

  const recurringDates = useMemo(
    () => selectedOccurrences.map((occurrence) => occurrence.date),
    [selectedOccurrences]
  );

  useEffect(() => {
    setOccurrenceOverrides({});
    setAvailabilityConflicts([]);
    setAvailabilityChecked(false);
  }, [courtId, date, time, duration, bookingMode, recurrencePreset]);

  const addSchedulePeriod = () => {
    if (!date || !time) {
      toast.error("Hãy chọn ngày và giờ của giai đoạn đầu trước");
      return;
    }
    const lastPeriod = schedulePeriods[schedulePeriods.length - 1];
    const nextDate = addDaysIso(lastPeriod?.endDate || endDate || date, 1);
    setSchedulePeriods((periods) => [
      ...periods,
      { id: Date.now() + periods.length, startDate: nextDate, endDate: nextDate, time },
    ]);
  };

  // Tính tổng tiền các dịch vụ phát sinh
  const servicesTotal = (balls * 20000) + (bibs * 10000) + (water * 10000) + (mineralWater * 15000);

  const [voucherCode, setVoucherCode] = useState(bookingDraft?.voucherCode || "");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number; validatedSubtotal: number } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  useEffect(() => {
    if (!fieldIdParam) return;
    (async () => {
      try {
        const [fRes, cRes] = await Promise.all([
          api.get<Field>(`/fields/${fieldIdParam}`),
          api.get<Court[]>(`/courts`, { params: { fieldId: fieldIdParam } }),
        ]);
        const activeCourts = cRes.data.filter((court) => court.status === "active");
        const requestedCourtId = courtIdParam ? Number(courtIdParam) : null;
        const nextCourtId = activeCourts.some((court) => court.id === requestedCourtId)
          ? requestedCourtId
          : activeCourts[0]?.id ?? null;
        setField(fRes.data);
        setCourts(activeCourts);
        setCourtId(nextCourtId);
        setTime(bookingDraft?.occurrences?.[0]?.time || bookingDraft?.time || timeParam || "");
      } catch {
        setField(null);
        setCourts([]);
        setCourtId(null);
        setTime("");
        toast.error("Không tìm thấy cơ sở hoặc sân đang chọn");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [fieldIdParam, courtIdParam, bookingDraft?.occurrences, bookingDraft?.time, timeParam]);

  const selectedCourt = courts.find((c) => c.id === courtId);

  const refreshBookedSlots = useCallback(async (force = false) => {
    if (!courtId || !date) return;
    try {
      const targetCourtIds = bookingMode === "full_field" ? courts.map((court) => court.id) : [courtId];
      const slots = (await Promise.all(targetCourtIds.map((id) => getBookedSlots(id, date, force)))).flat();
      setBookedSlots([...new Map(slots.map((slot) => [slot.id, slot])).values()]);
    } catch {
      // Giữ nguyên dữ liệu hiện có khi mạng lỗi để không vô tình mở lại ca đã giữ.
    }
  }, [courtId, date, bookingMode, courts]);

  useEffect(() => {
    refreshBookedSlots();
  }, [refreshBookedSlots]);

  // Khi khách quay lại từ Paygate hoặc có người khác vừa tạo đơn, lấy dữ liệu
  // mới từ API thay vì đợi người dùng F5 trang.
  useEffect(() => {
    if (!courtId || !date) return;
    const refresh = () => refreshBookedSlots(true);
    window.addEventListener("focus", refresh);
    window.addEventListener("booking:created", refresh);
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("booking:created", refresh);
      window.clearInterval(interval);
    };
  }, [courtId, date, refreshBookedSlots]);

  // Chỉ làm mờ các mốc thực sự nằm trong ca đã giữ.
  const slotDisabled = (slot: string) => {
    if (isPastVietnamSlot(date, slot, clockNow)) return true;
    const [hour, minute] = slot.split(":").map(Number);
    const slotMinute = hour * 60 + minute;
    return bookedSlots.some((booking) => {
      const [bookingHour, bookingMinute] = booking.time.split(":").map(Number);
      const start = bookingHour * 60 + bookingMinute;
      const end = start + booking.duration * 60;
      return slotMinute >= start && slotMinute < end;
    });
  };
  const overlappingBooking = (slot: string, selectedDuration = duration) =>
    bookedSlots.find((b) => isSlotConflict(b.time, b.duration, slot, selectedDuration));

  const selectTime = (slot: string) => {
    if (isPastVietnamSlot(date, slot)) {
      toast.error("Khung giờ này đã qua, vui lòng chọn giờ khác");
      return;
    }
    const conflict = overlappingBooking(slot);
    if (conflict) {
      toast.error(`Ca ${slot}–${getEndTime(slot, duration).toFixed(2).replace(".00", ":00").replace(".50", ":30")} bị trùng với ca đã đặt ${conflict.time}–${getEndTime(conflict.time, conflict.duration).toFixed(2).replace(".00", ":00").replace(".50", ":30")}. Vui lòng chỉnh giờ hoặc thời lượng.`);
      return;
    }
    setTime(slot);
  };

  const courtPrice = bookingMode === "full_field"
    ? courts.reduce((sum, court) => sum + Number(court.price || 0), 0)
    : selectedCourt?.price ?? field?.pricePerHour ?? 0;
  const scheduledHours = selectedOccurrences.reduce((sum, occurrence) => sum + Number(occurrence.duration || duration), 0);
  const subTotal = courtPrice * scheduledHours + servicesTotal;
  const normalizedVoucherInput = voucherCode.trim().toUpperCase();
  const activeVoucher = appliedVoucher &&
    normalizedVoucherInput === appliedVoucher.code &&
    appliedVoucher.validatedSubtotal === subTotal
    ? appliedVoucher
    : null;
  const discount = activeVoucher?.discountAmount || 0;
  const total = Math.max(0, subTotal - discount);
  const deposit = Math.round(total * 0.3);

  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("Vui lòng nhập mã khuyến mãi");
      return;
    }
    setVoucherLoading(true);
    try {
      const res = await api.post<{ code: string; type: "percent" | "fixed"; discountAmount: number }>("/vouchers/validate", {
        code: voucherCode.trim(),
        subtotal: subTotal,
      });
      setAppliedVoucher({
        code: res.data.code,
        discountAmount: Number(res.data.discountAmount),
        validatedSubtotal: subTotal,
      });
      setVoucherCode(res.data.code);
      toast.success("Đã áp dụng mã " + res.data.code + ": Giảm " + formatCurrency(res.data.discountAmount));
    } catch (error: unknown) {
      setAppliedVoucher(null);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Lỗi khi kiểm tra mã khuyến mãi");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCustomerChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateOccurrenceTime = (conflict: AvailabilityConflict, nextTime: string | null) => {
    const base = scheduledOccurrences.find((occurrence) => {
      const key = occurrence.date + "|" + occurrence.time;
      const current = occurrenceOverrides[key];
      return (current?.date || occurrence.date) === conflict.date && (current?.time || occurrence.time) === conflict.time;
    });
    if (!base) return;
    const key = base.date + "|" + base.time;
    const current = occurrenceOverrides[key];
    setOccurrenceOverrides((overrides) => ({ ...overrides, [key]: nextTime === null ? null : { date: current?.date || base.date, time: nextTime, duration: current?.duration || duration } }));
    setAvailabilityConflicts((items) => items.filter((item) => !(item.date === conflict.date && item.time === conflict.time)));
    setAvailabilityChecked(false);
  };

  const checkScheduleAvailability = async (): Promise<boolean> => {
    if (!selectedCourt || !selectedOccurrences.length) return false;
    setCheckingAvailability(true);
    try {
      const response = await api.post<{ available: boolean; conflicts: AvailabilityConflict[] }>("/bookings/check-availability", {
        courtId: selectedCourt.id,
        bookingMode,
        duration,
        occurrences: selectedOccurrences,
      });
      setAvailabilityConflicts(response.data.conflicts);
      setAvailabilityChecked(true);
      if (!response.data.available) {
        toast.error("Có " + response.data.conflicts.length + " buổi bị trùng. Hãy chọn giờ khác hoặc bỏ buổi đó.");
        window.requestAnimationFrame(() => conflictSummaryRef.current?.focus());
      } else {
        toast.success("Tất cả các buổi đang còn trống");
      }
      return response.data.available;
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAvailabilityChecked(false);
      toast.error(message || "Không thể kiểm tra lịch trống");
      return false;
    } finally {
      setCheckingAvailability(false);
    }
  };

  const advanceStep = async () => {
    if (currentStep === 1) {
      if (!selectedCourt || !date || !time) {
        toast.error("Vui lòng chọn sân, ngày và khung giờ trước khi tiếp tục");
        return;
      }
      if (schedulePeriods.some((period) => !period.startDate || !period.endDate || !period.time || period.endDate < period.startDate)) {
        toast.error("Vui lòng điền đầy đủ và đúng thứ tự ngày cho các giai đoạn lịch");
        return;
      }
      if (!selectedOccurrences.length || selectedOccurrences.length > 60) {
        toast.error("Tổng số buổi phải từ 1 đến 60");
        return;
      }
      const elapsedOccurrence = selectedOccurrences.find((occurrence) => isPastVietnamSlot(occurrence.date, occurrence.time));
      if (elapsedOccurrence) {
        toast.error("Khung giờ " + elapsedOccurrence.time + " ngày " + elapsedOccurrence.date + " đã qua");
        return;
      }
      if (bookingMode === "full_field" && courts.length < 2) {
        toast.error("Cơ sở cần ít nhất 2 sân con đang hoạt động để bao sân");
        return;
      }
      if (selectedOccurrences.some((occurrence) => getEndTime(occurrence.time, Number(occurrence.duration || duration)) > closingTime) || overlappingBooking(time)) {
        toast.error("Khung giờ hoặc thời lượng đã chọn không còn phù hợp");
        return;
      }
      if (!(await checkScheduleAvailability())) return;
    }
    if (currentStep === 2) {
      if (!customer.fullName.trim()) {
        toast.error("Vui lòng nhập họ và tên");
        return;
      }
      if (!customer.phone.trim() || customer.phone.trim().length < 9) {
        toast.error("Số điện thoại chưa hợp lệ");
        return;
      }
    }
    goToStep(Math.min(3, currentStep + 1));
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
    const elapsedOccurrence = selectedOccurrences.find((occurrence) => isPastVietnamSlot(occurrence.date, occurrence.time));
    if (elapsedOccurrence) {
      toast.error("Khung giờ " + elapsedOccurrence.time + " ngày " + elapsedOccurrence.date + " đã qua, vui lòng chọn giờ khác");
      return;
    }
    if (selectedOccurrences.some((occurrence) => getEndTime(occurrence.time, Number(occurrence.duration || duration)) > closingTime)) {
      toast.error(`Thời lượng đặt sân vượt quá giờ đóng cửa (${field.closeTime})`);
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
    if (!paymentMethod) {
      setPaymentError("Vui lòng chọn cách thanh toán trước khi xác nhận đặt sân.");
      toast.error("Vui lòng chọn phương thức thanh toán");
      return;
    }
    if (overlappingBooking(time)) {
      toast.error("Khung giờ này bị chồng với một ca đã đặt. Vui lòng chỉnh giờ hoặc thời lượng.");
      return;
    }

    const user = getUser();
    setLoading(true);

    if (!(await checkScheduleAvailability())) {
      setLoading(false);
      return;
    }

    const services = [];
    if (balls > 0) services.push({ name: "Bóng rổ", quantity: balls, price: 20000 });
    if (bibs > 0) services.push({ name: "Áo pitch", quantity: bibs, price: 10000 });
    if (water > 0) services.push({ name: "Nước lọc", quantity: water, price: 10000 });
    if (mineralWater > 0) services.push({ name: "Nước muối khoáng", quantity: mineralWater, price: 15000 });

    const payload = {
      fieldId: field.id,
      courtId: selectedCourt.id,
      fieldName: field.name,
      court: selectedCourt.name,
      date: selectedOccurrences[0]?.date || date,
      recurringDates,
      scheduleSegments,
      occurrences: selectedOccurrences,
      bookingMode,
      time: selectedOccurrences[0]?.time || time,
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
      voucherCode: activeVoucher?.code || "",
      discount: activeVoucher?.discountAmount || 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await api.post("/bookings", payload);
      for (const bookedDate of [...new Set(recurringDates)]) {
        invalidateApiCache(`bookings:date:${bookedDate}`);
      }
      if (res.data.date === date && res.data.courtId === selectedCourt.id) {
        setBookedSlots((previous) => previous.some((booking) => booking.id === res.data.id)
          ? previous
          : [...previous, res.data]);
      }
      window.dispatchEvent(new CustomEvent("booking:created", { detail: res.data }));

      const backendTotal = Number(res.data.groupTotal ?? res.data.total ?? 0);
      if (paymentMethod === "cash" || backendTotal === 0) {
        const code = `BK${String(res.data.id).padStart(6, "0")}`;
        const qrData = `CHECKIN-${code} | Sân: ${payload.fieldName} - ${payload.court} | Tên: ${payload.customer.fullName} | ĐT: ${payload.customer.phone}`;
        const checkinQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=250`;

        setSuccess({
          code,
          paymentMethod: backendTotal === 0 ? "voucher" : "cash",
          checkinQrUrl,
        });
        toast.success(backendTotal === 0 ? "Voucher đã thanh toán toàn bộ đơn!" : "Đặt sân thành công!");
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate("/paygate", { state: { payload, booking: res.data, deposit, total } });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      const errorMessage = err?.response?.data?.message;

      // Xử lý tự động khi dính lỗi 409 Conflict: Reload lại lịch sân để cập nhật dữ liệu mới nhất
      if (err?.response?.status === 409) {
        toast.error(errorMessage || "Khung giờ này vừa có người đặt. Lịch sân đã được tự động cập nhật lại!");
        await refreshBookedSlots(true);
      } else {
        toast.error(errorMessage || "Tạo đơn đặt sân thất bại. Vui lòng thử lại!");
      }
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-3 bg-[#f7f8f6] min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
        <p className="text-gray-400 text-sm font-medium">Đang chuẩn bị trang đặt sân...</p>
      </div>
    );
  }

  if (!fieldIdParam || !field) {
    return (
      <div className="min-h-[62vh] bg-[#f7f8f6] flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-3xl">🏀</div>
          <h2 className="text-2xl font-bold text-slate-950 mb-2">Chưa chọn sân bóng rổ</h2>
          <p className="text-slate-500 mb-6">Vui lòng chọn sân trước khi thực hiện đặt lịch.</p>
          <Link to="/fields" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl">
            Tìm sân ngay →
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-20 px-4">
        <div className="bg-white rounded-3xl border border-amber-200 p-8 md:p-10 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mx-auto mb-5 text-yellow-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-950 mb-2">
            {location.state?.isAutoTransfer ? "Chuyển khoản thành công!" : "Đặt sân thành công!"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Mã đơn của bạn: <span className="font-extrabold text-yellow-400 text-base">{success.code}</span>
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8">
            {success.checkinQrUrl ? (
              <img src={success.checkinQrUrl} alt="Check-in QR" className="w-44 h-44 mx-auto object-contain rounded-xl bg-white p-2" />
            ) : (
              <QrCode className="w-40 h-40 mx-auto text-yellow-500" />
            )}
            <p className="text-xs text-slate-500 mt-3 font-medium">
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
    <div className="min-h-screen bg-[#f7f8f6] text-slate-700 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 tracking-wide uppercase font-bold">
          <Link to="/" className="hover:text-yellow-400 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/detail/${field.id}`} className="hover:text-yellow-400 transition-colors">{field.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-yellow-500">Đặt lịch thi đấu</span>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm" aria-label={`Bước ${currentStep} trên 3`}>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[
              { step: 1, label: "Lịch sân", desc: "Sân & thời gian" },
              { step: 2, label: "Thông tin", desc: "Dịch vụ & liên hệ" },
              { step: 3, label: "Xác nhận", desc: "Thanh toán" },
            ].map((item) => {
              const active = currentStep === item.step;
              const done = currentStep > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  disabled={item.step > currentStep}
                  onClick={() => item.step < currentStep && goToStep(item.step)}
                  className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${active ? "bg-yellow-500/10 border border-yellow-500/35" : "border border-transparent"} ${item.step <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-55"}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${active ? "bg-amber-400 text-slate-950" : done ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : item.step}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-extrabold ${active ? "text-slate-950" : "text-slate-500"}`}>{item.label}</span>
                    <span className="hidden text-xs text-gray-500 md:block">{item.desc}</span>
                  </span>
                  {item.step < 3 && <span className={`absolute -right-3 top-1/2 hidden h-px w-4 md:block ${done ? "bg-emerald-500" : "bg-slate-200"}`} />}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 1 && <>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">1</span>
                Chọn sân đấu
              </h3>
              <p className="text-sm text-slate-500 mb-6 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                {field.name} · {field.address}
              </p>

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBookingMode("court")}
                  className={bookingMode === "court" ? "rounded-2xl border border-amber-400 bg-amber-50 p-4 text-left ring-1 ring-amber-200" : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-amber-300"}
                >
                  <span className="block text-sm font-extrabold text-slate-900">Đặt một sân con</span>
                  <span className="mt-1 block text-xs text-slate-500">Chọn một sân theo mức giá riêng</span>
                </button>
                <button
                  type="button"
                  disabled={courts.length < 2}
                  onClick={() => setBookingMode("full_field")}
                  className={bookingMode === "full_field" ? "rounded-2xl border border-amber-400 bg-amber-50 p-4 text-left ring-1 ring-amber-200" : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"}
                >
                  <span className="block text-sm font-extrabold text-slate-900">Bao toàn bộ sân</span>
                  <span className="mt-1 block text-xs text-slate-500">Giữ đồng thời {courts.length} sân con · {formatCurrency(courts.reduce((sum, court) => sum + Number(court.price || 0), 0))}/giờ</span>
                </button>
              </div>

              {bookingMode === "full_field" && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                  <strong>Đã chọn toàn bộ {courts.length} sân con.</strong> Khung giờ chỉ có thể chọn khi tất cả các sân con đều đang trống và tổng tiền sẽ cộng giá của cả {courts.length} sân.
                </div>
              )}

              {courts.length === 0 ? (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
                  Cơ sở này chưa có sân đang hoạt động. Vui lòng chọn cơ sở khác hoặc liên hệ quản lý sân.
                </div>
              ) : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {courts.map((c) => {
                  const active = bookingMode === "full_field" || courtId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={bookingMode === "full_field"}
                      onClick={() => setCourtId(c.id)}
                      className={`rounded-2xl p-4 text-left transition-all relative overflow-hidden border ${
                        active
                          ? "bg-amber-50 border-amber-400 text-amber-700 shadow-sm ring-1 ring-amber-200"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300"
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 mb-1 flex items-center justify-between">
                        {c.name}
                        {active && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                      </div>
                      <div className={`text-xs font-semibold ${active ? "text-amber-700" : "text-slate-500"}`}>
                        {bookingMode === "full_field" ? "Đã nằm trong gói bao sân" : formatCurrency(c.price) + " / giờ"}
                      </div>
                    </button>
                  );
                })}
              </div>}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-950 mb-6 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">2</span>
                Thời gian đặt sân
              </h3>

              <div className="mb-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Kiểu lịch</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    { id: "single" as RecurrencePreset, label: "Một buổi", description: "Chỉ ngày đã chọn" },
                    { id: "daily" as RecurrencePreset, label: "Hằng ngày", description: "Mỗi ngày trong khoảng chọn" },
                    { id: "weekly" as RecurrencePreset, label: "Hàng tuần", description: "Cùng thứ, cùng giờ" },
                    { id: "monthly" as RecurrencePreset, label: "Trọn tháng", description: "Cùng thứ, cùng giờ trong 30 ngày" },
                  ]).map((option) => {
                    const active = recurrencePreset === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setRecurrencePreset(option.id);
                          setOccurrenceOverrides({});
                          setAvailabilityConflicts([]);
                          if (option.id === "single") setEndDate("");
                          if (option.id === "daily" && date) setEndDate(addDaysIso(date, 6));
                          if (option.id === "weekly" && date) setEndDate(addDaysIso(date, 28));
                          if (option.id === "monthly" && date) setEndDate(monthPlanEndIso(date));
                        }}
                        className={"min-h-20 rounded-2xl border p-4 text-left transition " + (active ? "border-amber-400 bg-amber-50 ring-1 ring-amber-200" : "border-slate-200 bg-slate-50 hover:border-amber-300")}
                        aria-pressed={active}
                      >
                        <span className="block text-sm font-black text-slate-950">{option.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={todayIso}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setOccurrenceOverrides({});
                      setAvailabilityConflicts([]);
                      if (recurrencePreset === "monthly" && e.target.value) setEndDate(monthPlanEndIso(e.target.value));
                      else if (recurrencePreset === "daily" && e.target.value) setEndDate(addDaysIso(e.target.value, 6));
                      else if (recurrencePreset === "weekly" && e.target.value) setEndDate(addDaysIso(e.target.value, 28));
                      else if (endDate && e.target.value > endDate) setEndDate("");
                      setTime("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ colorScheme: "light" }}
                  />
                </div>

{recurrencePreset !== "single" && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {recurrencePreset === "monthly" ? "Đến hết gói 30 ngày" : recurrencePreset === "daily" ? "Lặp hằng ngày đến ngày" : "Lặp hàng tuần đến ngày"}
                  </label>
                  <input
                    type="date"
                    value={recurrencePreset === "monthly" && date ? monthPlanEndIso(date) : endDate}
                    min={date || todayIso}
                    max={new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().slice(0, 10)}
                    disabled={recurrencePreset === "monthly"}
                    onChange={(e) => { setEndDate(e.target.value); setOccurrenceOverrides({}); setAvailabilityConflicts([]); }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-100"
                    style={{ colorScheme: "light" }}
                  />
                </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Chọn khung giờ bắt đầu
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {timeSlots.map((t) => {
                    const disabled = !selectedCourt || !date || slotDisabled(t);
                    const selected = time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectTime(t)}
                        className={`rounded-xl py-2.5 text-xs font-bold transition-all border ${
                          selected
                            ? "bg-yellow-500 text-black border-yellow-500 shadow-md shadow-yellow-500/30 scale-105"
                            : disabled
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                            : "bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {time && getEndTime(time, 1) >= closingTime && (
                  <p className="text-xs text-yellow-500/80 mt-2 font-medium">
                    * Sân đóng cửa lúc {field.closeTime} nên chỉ áp dụng thời lượng phù hợp.
                  </p>
                )}
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Đổi khung giờ theo giai đoạn</h4>
                    <p className="mt-1 text-xs text-slate-500">Bấm thêm để tạo ngay lịch ngày kế tiếp; bạn có thể đổi ngày hoặc giờ sau đó.</p>
                  </div>
                  <button
                    type="button"
                    disabled={schedulePeriods.length >= 11 || !date || !time}
                    onClick={addSchedulePeriod}
                    className="btn-outline inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" /> Thêm giai đoạn
                  </button>
                </div>

                <div className="space-y-3">
                  {schedulePeriods.map((period, index) => (
                    <div key={period.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_0.8fr_auto]">
                      <label className="text-xs font-bold text-slate-500">
                        Từ ngày
                        <input type="date" value={period.startDate} min={date || todayIso} onChange={(event) => setSchedulePeriods((periods) => periods.map((item) => item.id === period.id ? { ...item, startDate: event.target.value, endDate: item.endDate && item.endDate < event.target.value ? "" : item.endDate } : item))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-400" />
                      </label>
                      <label className="text-xs font-bold text-slate-500">
                        Đến ngày
                        <input type="date" value={period.endDate} min={period.startDate || date || todayIso} onChange={(event) => setSchedulePeriods((periods) => periods.map((item) => item.id === period.id ? { ...item, endDate: event.target.value } : item))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-400" />
                      </label>
                      <label className="text-xs font-bold text-slate-500">
                        Khung giờ
                        <select value={period.time} onChange={(event) => setSchedulePeriods((periods) => periods.map((item) => item.id === period.id ? { ...item, time: event.target.value } : item))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-400">
                          <option value="">Chọn giờ</option>
                          {timeSlots.filter((slot) => getEndTime(slot, duration) <= closingTime).map((slot) => <option key={slot} value={slot} disabled={isPastVietnamSlot(period.startDate, slot, clockNow)}>{slot}</option>)}
                        </select>
                      </label>
                      <button type="button" onClick={() => setSchedulePeriods((periods) => periods.filter((item) => item.id !== period.id))} className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50" aria-label={"Xóa giai đoạn " + (index + 2)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {selectedOccurrences.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="text-sm font-extrabold text-amber-900">Lịch sẽ được giữ ngay khi xác nhận</h5>
                      <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">{selectedOccurrences.length} buổi</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(showAllOccurrences ? selectedOccurrences : selectedOccurrences.slice(0, 12)).map((occurrence, index) => (
                        <div key={occurrence.sourceKey} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs">
                          <span className="font-bold text-slate-500">Buổi {index + 1}</span>
                          <span className="min-w-0 flex-1 text-right font-extrabold text-slate-900">{occurrence.date.split("-").reverse().join("/")} · {occurrence.time} · {occurrence.duration}h</span>
                          <button type="button" onClick={() => setEditingOccurrence({ sourceKey: occurrence.sourceKey, date: occurrence.date, time: occurrence.time, duration: Number(occurrence.duration || duration) })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-amber-200 px-3 text-[11px] font-bold text-amber-800 hover:bg-amber-50" aria-label={`Sửa buổi ${index + 1}`}>
                            <Pencil className="h-3 w-3" aria-hidden="true" /> Sửa
                          </button>
                        </div>
                      ))}
                    </div>
                    {selectedOccurrences.length > 12 && (
                      <button type="button" onClick={() => setShowAllOccurrences((current) => !current)} className="mt-3 min-h-11 text-xs font-bold text-amber-900 underline underline-offset-2">
                        {showAllOccurrences ? "Thu gọn danh sách" : `Xem và sửa tất cả ${selectedOccurrences.length} buổi`}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void checkScheduleAvailability()}
                    disabled={checkingAvailability || !selectedOccurrences.length}
                    className="btn-outline min-h-11 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40"
                  >
                    {checkingAvailability ? "Đang kiểm tra..." : "Kiểm tra toàn bộ lịch"}
                  </button>
                  {availabilityChecked && availabilityConflicts.length === 0 && (
                    <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Tất cả buổi đang còn trống
                    </span>
                  )}
                </div>

                {availabilityConflicts.length > 0 && (
                  <div ref={conflictSummaryRef} tabIndex={-1} role="alert" aria-labelledby="schedule-conflict-title" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 outline-none focus:ring-2 focus:ring-rose-400">
                    <h5 id="schedule-conflict-title" className="text-sm font-black text-rose-900">Có {availabilityConflicts.length} buổi đã có người đặt</h5>
                    <p className="mt-1 text-xs leading-5 text-rose-700">Chọn một giờ còn trống cho từng ngày hoặc bỏ riêng ngày đó khỏi đơn.</p>
                    <div className="mt-4 space-y-3">
                      {availabilityConflicts.map((conflict) => (
                        <div key={conflict.date + "|" + conflict.time} className="rounded-xl border border-rose-200 bg-white p-3">
                          <div className="text-sm font-black text-slate-900">{conflict.date.split("-").reverse().join("/")} · {conflict.time} đã kín</div>
                          {conflict.suggestions.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {conflict.suggestions.map((suggestion) => (
                                <button key={suggestion} type="button" onClick={() => updateOccurrenceTime(conflict, suggestion)} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                                  Chọn {suggestion}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-slate-500">Ngày này không còn giờ phù hợp với thời lượng đã chọn.</p>
                          )}
                          <button type="button" onClick={() => updateOccurrenceTime(conflict, null)} className="mt-3 min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">Bỏ ngày này</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            </>}

            {currentStep === 2 && <>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-950 mb-6 flex items-center gap-2.5">
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
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-xs text-yellow-500 font-semibold mt-0.5">{s.price}</div>
                    </div>
                    <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => s.set(Math.max(0, s.val - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 font-bold transition-all"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-slate-900 text-sm min-w-[18px] text-center">{s.val}</span>
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

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-950 mb-6 flex items-center gap-2.5">
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số điện thoại *</label>
                  <input
                    name="phone"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400"
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
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none placeholder:text-slate-400"
                  placeholder="Yêu cầu chuẩn bị sân, bóng mới..."
                />
              </div>
            </div>

            </>}

            {currentStep === 3 && <>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-950 mb-6 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">5</span>
                Phương thức thanh toán
              </h3>

              <fieldset
                id="payment-methods"
                aria-describedby={paymentError ? "payment-method-error" : undefined}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <legend className="sr-only">Chọn phương thức thanh toán</legend>
                {[
                  {
                    id: "deposit",
                    title: "Đặt cọc (30%)",
                    desc: "Giữ sân trước, thanh toán 70% còn lại sau",
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
                          : "bg-slate-50 border-slate-200 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={active}
                          onChange={() => {
                            setPaymentMethod(item.id as PaymentMethod);
                            setPaymentError("");
                          }}
                          className="accent-yellow-500 w-4 h-4 mt-1"
                        />
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
                          {item.badge}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-base mt-2">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                    </label>
                  );
                })}
              </fieldset>
              <div className="mt-3 min-h-5" aria-live="polite">
                {paymentError && (
                  <p id="payment-method-error" role="alert" className="text-sm font-semibold text-red-600">
                    {paymentError}
                  </p>
                )}
              </div>
            </div>
            </>}

            <div className="flex items-center justify-between gap-3 pt-1 lg:hidden">
              {currentStep > 1 ? (
                <button type="button" onClick={() => goToStep(currentStep - 1)} className="btn-outline min-h-12 flex-1 rounded-xl px-5 py-3 text-sm font-bold">
                  <ArrowLeft className="mr-2 inline h-4 w-4" /> Quay lại
                </button>
              ) : <span />}
              {currentStep < 3 && (
                <button type="button" onClick={advanceStep} className="btn-primary min-h-12 flex-1 rounded-xl px-5 py-3 text-sm font-extrabold">
                  Tiếp tục <ChevronRight className="ml-1 inline h-4 w-4" />
                </button>
              )}
            </div>

          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

                <h3 className="text-xl font-extrabold text-slate-950 mb-6 flex items-center justify-between">
                  Tóm tắt đơn đặt
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </h3>

                <div className="space-y-4 mb-6 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Cơ sở</span>
                    <span className="text-slate-900 font-bold text-right max-w-[60%] line-clamp-1">{field.name}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-500">Sân đấu</span>
                    <span className="text-slate-900 font-bold">{bookingMode === "full_field" ? "Bao toàn bộ sân (" + courts.length + " sân con)" : selectedCourt?.name || "—"}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-yellow-500" /> Ngày
                    </span>
                    <span className="text-slate-900 font-bold">
                      {date || "Chưa chọn"} {recurringDates.length > 1 && <span className="text-yellow-400 ml-1">({recurringDates.length} buổi)</span>}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-yellow-500" /> Giờ đá
                    </span>
                    <span className="text-slate-900 font-bold">{scheduleSegments.length > 1 ? scheduleSegments.length + " giai đoạn" : time || "Chưa chọn"} ({duration}h)</span>
                  </div>

                  {servicesTotal > 0 && (
                    <div className="flex justify-between border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Dịch vụ thêm</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(servicesTotal)}</span>
                    </div>
                  )}

                  <div className="pt-2 pb-3">
                    <div className="flex gap-2">
                      <input
                        value={voucherCode}
                        onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); }}
                        placeholder="MÃ GIẢM GIÁ..."
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full text-xs font-bold text-slate-900 outline-none focus:border-amber-400 uppercase placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={applyVoucher}
                        disabled={voucherLoading || !subTotal || !voucherCode.trim()}
                        className="btn-outline px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-40"
                      >
                        {voucherLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Áp dụng"}
                      </button>
                    </div>
                  </div>

                  {activeVoucher && (
                    <div className="flex justify-between border-b border-slate-100 pb-3 text-emerald-600">
                      <span className="flex items-center gap-1"><Tag size={14} /> Giảm giá voucher</span>
                      <span className="font-extrabold">-{formatCurrency(activeVoucher.discountAmount)}</span>
                    </div>
                  )}

                  {paymentMethod === "deposit" && (
                    <div className="flex justify-between border-b border-amber-100 pb-3 bg-amber-50 px-3 py-2 rounded-xl">
                      <span className="text-amber-700 font-bold">Tiền cọc trước (30%)</span>
                      <span className="text-amber-700 font-extrabold text-base">{formatCurrency(deposit)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 font-bold">Tổng thanh toán</span>
                    <span className="text-2xl font-black text-slate-950">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => goToStep(currentStep - 1)}
                    className="btn-outline hidden min-h-14 rounded-xl px-4 font-bold lg:inline-flex lg:items-center lg:justify-center"
                    aria-label="Quay lại bước trước"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <button
                  type={currentStep === 3 ? "submit" : "button"}
                  onClick={currentStep < 3 ? advanceStep : undefined}
                  disabled={loading || checkingAvailability}
                  className="btn-primary w-full py-4 rounded-xl font-extrabold flex justify-center items-center gap-2 transition-all disabled:opacity-50 text-base"
                >
                  {loading || checkingAvailability ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {checkingAvailability ? "Đang kiểm tra lịch..." : "Đang xử lý..."}
                    </>
                  ) : currentStep < 3 ? (
                    <>
                      Tiếp tục bước {currentStep + 1}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : !paymentMethod ? (
                    <>
                      <Wallet className="w-5 h-5" />
                      Chọn phương thức thanh toán
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
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
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
      {editingOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-occurrence-title">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="edit-occurrence-title" className="text-xl font-black text-slate-950">Sửa riêng buổi này</h2><p className="mt-1 text-sm text-slate-500">Các buổi khác vẫn được giữ nguyên.</p></div>
              <button type="button" onClick={() => setEditingOccurrence(null)} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200" aria-label="Đóng"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="text-xs font-bold uppercase text-slate-500">Ngày chơi<input type="date" min={todayIso} value={editingOccurrence.date} onChange={(event) => setEditingOccurrence((current) => current ? { ...current, date: event.target.value } : current)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900" /></label>
              <fieldset><legend className="mb-2 text-xs font-bold uppercase text-slate-500">Thời lượng chơi</legend><div className="flex flex-wrap gap-2">{DURATIONS.map((option) => <button key={option.value} type="button" aria-pressed={editingOccurrence.duration === option.value} onClick={() => setEditingOccurrence((current) => current ? { ...current, duration: option.value } : current)} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${editingOccurrence.duration === option.value ? "border-amber-400 bg-amber-400 text-slate-950" : "border-slate-200 bg-white text-slate-700"}`}>{option.label}</button>)}</div></fieldset>
              <label className="text-xs font-bold uppercase text-slate-500">Giờ bắt đầu<select value={editingOccurrence.time} onChange={(event) => setEditingOccurrence((current) => current ? { ...current, time: event.target.value } : current)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">{timeSlots.filter((slot) => getEndTime(slot, editingOccurrence.duration) <= closingTime && !isPastVietnamSlot(editingOccurrence.date, slot, clockNow)).map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
              <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Sau khi lưu, hệ thống sẽ kiểm tra toàn bộ lịch và gợi ý giờ khác nếu buổi này đã có người đặt.</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => setEditingOccurrence(null)} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold">Hủy</button>
              <button type="button" disabled={!editingOccurrence.date || !editingOccurrence.time || getEndTime(editingOccurrence.time, editingOccurrence.duration) > closingTime} onClick={() => {
                const duplicate = selectedOccurrences.some((item) => item.sourceKey !== editingOccurrence.sourceKey && item.date === editingOccurrence.date && item.time === editingOccurrence.time);
                if (duplicate) { toast.error("Ngày và giờ này đang trùng với một buổi khác trong lịch"); return; }
                setOccurrenceOverrides((current) => ({ ...current, [editingOccurrence.sourceKey]: { date: editingOccurrence.date, time: editingOccurrence.time, duration: editingOccurrence.duration } }));
                setAvailabilityConflicts([]); setAvailabilityChecked(false); setEditingOccurrence(null);
                toast.success("Đã sửa buổi này. Hãy kiểm tra toàn bộ lịch trước khi tiếp tục.");
              }} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white hover:bg-amber-400 hover:text-slate-950 disabled:opacity-50">Lưu buổi</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
