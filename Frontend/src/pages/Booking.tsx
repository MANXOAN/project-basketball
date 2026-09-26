import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  CalendarDays, Clock, MapPin, CheckCircle2, Loader2, Wallet, QrCode, Tag, ChevronRight, ShieldCheck, Sparkles, ArrowLeft, Trash2, Pencil, X, RotateCcw, AlertTriangle, UserRound, Check
} from "lucide-react";
import {
  api, Booking as BookingRecord, Court, Field, formatCurrency, getBookingsByDate, invalidateApiCache,
} from "../lib/api";
import { getUser } from "../lib/auth";
import { isPastVietnamSlot, vietnamTodayIso } from "../lib/bookingTime";
import {
  addDaysIso, cellsOf, expandScheduleDates, formatDateVi, frameEnd, MAX_FRAME_HOURS, MAX_OCCURRENCES, MIN_FRAME_HOURS,
  RecurrencePreset, rangesOverlap, ScheduleDraft, slotsToFrames, sortSlots, TimeFrame, WEEKDAY_LABELS, weekdayOf,
} from "../lib/bookingSchedule";
import BookingSlotGrid, { SlotAvailability } from "../components/BookingSlotGrid";

type BookingMode = "court" | "full_field";
type ScheduleOccurrence = { date: string; time: string; duration: number };
type AvailabilityConflict = ScheduleOccurrence & { suggestions: string[] };
type FrameIssue = "past" | "booked" | "short" | "long";

type BookingDraft = {
  fieldId?: number;
  courtId?: number;
  date?: string;
  occurrences?: ScheduleOccurrence[];
  scheduleDraft?: ScheduleDraft;
  bookingMode?: BookingMode;
  time?: string;
  duration?: number;
  customer?: { fullName?: string; phone?: string; note?: string };
  services?: Array<{ name?: string; quantity?: number }>;
  paymentMethod?: PaymentMethod;
  voucherCode?: string;
};

type PaymentMethod = "deposit" | "full" | "cash";

const PRESET_OPTIONS: Array<{ id: RecurrencePreset; label: string; description: string }> = [
  { id: "single", label: "Một buổi", description: "Chỉ một ngày" },
  { id: "daily", label: "Hằng ngày", description: "Mỗi ngày trong khoảng chọn" },
  { id: "weekly", label: "Hàng tuần", description: "Các thứ đã chọn mỗi tuần" },
  { id: "monthly", label: "Hàng tháng", description: "Cùng ngày mỗi tháng" },
];

const FRAME_ISSUE_LABELS: Record<FrameIssue, string> = {
  booked: "Trùng lịch",
  past: "Đã qua",
  short: `Dưới ${MIN_FRAME_HOURS} giờ`,
  long: `Quá ${MAX_FRAME_HOURS} giờ`,
};

const formatHours = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
const frameLabel = (frame: TimeFrame) => `${frame.time}–${frameEnd(frame)}`;

// ── Lớp trình bày dùng chung (chỉ giao diện) ──────────────────────────
const inputClass = "input text-sm font-medium";
const labelClass = "mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600";
const optionCard = (active: boolean) =>
  `group relative rounded-2xl border p-4 text-left transition-all duration-200 ${active
    ? "border-brand-500 bg-brand-50 shadow-[0_0_0_3px_var(--color-brand-100)]"
    : "border-stone-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"}`;
const OptionCheck = ({ active }: { active: boolean }) => (
  <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border transition ${active ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-transparent"}`} aria-hidden="true">
    <Check className="h-3 w-3" strokeWidth={3.5} />
  </span>
);
const SectionTitle = ({ icon, eyebrow, title, desc }: { icon: ReactNode; eyebrow: string; title: string; desc?: ReactNode }) => (
  <div className="mb-6 flex items-start gap-4">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">{icon}</span>
    <div className="min-w-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-stone-950">{title}</h2>
      {desc && <p className="mt-1 text-sm text-stone-600">{desc}</p>}
    </div>
  </div>
);
const SubStep = ({ index, icon, title, action }: { index: number; icon: ReactNode; title: string; action?: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2.5 text-sm font-extrabold text-stone-900">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-[11px] font-black text-white">{index}</span>
      <span className="text-brand-600" aria-hidden="true">{icon}</span>
      {title}
    </div>
    {action}
  </div>
);


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
  const [customer, setCustomer] = useState({
    fullName: bookingDraft?.customer?.fullName || getUser()?.fullName || "",
    phone: bookingDraft?.customer?.phone || getUser()?.phone || "",
    note: bookingDraft?.customer?.note || "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(bookingDraft?.paymentMethod || null);
  const [paymentError, setPaymentError] = useState("");
  const todayIso = vietnamTodayIso(clockNow);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // Lịch được lưu dạng "mẫu": kiểu lặp + các ô 30 phút áp dụng cho mọi ngày,
  // cộng với các ngày được sửa riêng (dayOverrides; mảng rỗng = bỏ ngày đó).
  const [schedule, setSchedule] = useState<ScheduleDraft>(() => {
    const saved = bookingDraft?.scheduleDraft;
    if (saved?.startDate) return { ...saved, weekdays: saved.weekdays || [], dayOverrides: saved.dayOverrides || {} };
    const startDate = bookingDraft?.date || dateParam || "";
    const startTime = bookingDraft?.time || timeParam || "";
    return {
      preset: "single",
      startDate,
      endDate: "",
      weekdays: startDate ? [weekdayOf(startDate)] : [],
      months: 3,
      slots: /^\d{2}:\d{2}$/.test(startTime) ? cellsOf(startTime, Number(bookingDraft?.duration || 1)) : [],
      dayOverrides: {},
    };
  });
  const updateSchedule = (patch: Partial<ScheduleDraft>) => setSchedule((current) => ({ ...current, ...patch }));
  const [editingDay, setEditingDay] = useState<{ date: string; slots: string[] } | null>(null);
  const [availabilityConflicts, setAvailabilityConflicts] = useState<AvailabilityConflict[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, BookingRecord[]>>({});

  // State dịch vụ đi kèm
  const [balls, setBalls] = useState(draftServiceQuantity("Bóng rổ"));
  const [bibs, setBibs] = useState(draftServiceQuantity("Áo pitch"));
  const [water, setWater] = useState(draftServiceQuantity("Nước lọc"));
  const [mineralWater, setMineralWater] = useState(draftServiceQuantity("Nước muối khoáng"));

  const timeSlots = useMemo(() => {
    const [openHour, openMinute] = (field?.openTime || "06:00").split(":").map(Number);
    const [closeHour, closeMinute] = (field?.closeTime || "22:00").split(":").map(Number);
    const slots: string[] = [];
    for (let minute = openHour * 60 + openMinute; minute < closeHour * 60 + closeMinute; minute += 30) {
      slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
    return slots;
  }, [field?.openTime, field?.closeTime]);
  const timeSlotSet = useMemo(() => new Set(timeSlots), [timeSlots]);

  const allScheduleDates = useMemo(
    () => expandScheduleDates(schedule),
    [schedule.preset, schedule.startDate, schedule.endDate, schedule.weekdays, schedule.months] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const tooManyDates = allScheduleDates.length > MAX_OCCURRENCES;
  const scheduleDates = useMemo(() => allScheduleDates.slice(0, MAX_OCCURRENCES), [allScheduleDates]);
  const patternSlots = useMemo(() => sortSlots(schedule.slots.filter((slot) => timeSlotSet.has(slot))), [schedule.slots, timeSlotSet]);
  const scheduleDays = useMemo(() => scheduleDates.map((date) => {
    const override = schedule.dayOverrides[date];
    const slots = override ? sortSlots(override.filter((slot) => timeSlotSet.has(slot))) : patternSlots;
    return { date, slots, customized: Boolean(override), frames: slotsToFrames(slots) };
  }), [scheduleDates, schedule.dayOverrides, patternSlots, timeSlotSet]);
  // Ngày chưa sửa riêng đi theo lưới giờ chung; nếu đã sửa hết thì lưới chung xét mọi ngày.
  const patternDates = useMemo(() => {
    const following = scheduleDays.filter((day) => !day.customized).map((day) => day.date);
    return following.length ? following : scheduleDates;
  }, [scheduleDays, scheduleDates]);

  const selectedOccurrences = useMemo<ScheduleOccurrence[]>(
    () => scheduleDays.flatMap((day) => day.frames.map((frame) => ({ date: day.date, time: frame.time, duration: frame.duration }))),
    [scheduleDays]
  );
  const occurrencesKey = selectedOccurrences.map((item) => `${item.date}|${item.time}|${item.duration}`).join(",");
  const recurringDates = useMemo(() => [...new Set(selectedOccurrences.map((item) => item.date))], [selectedOccurrences]);

  useEffect(() => {
    setAvailabilityConflicts([]);
    setAvailabilityChecked(false);
  }, [occurrencesKey, courtId, bookingMode]);

  const changePreset = (preset: RecurrencePreset) => {
    const start = schedule.startDate;
    updateSchedule({
      preset,
      endDate: !start ? "" : preset === "daily" ? addDaysIso(start, 6) : preset === "weekly" ? addDaysIso(start, 27) : "",
      weekdays: schedule.weekdays.length ? schedule.weekdays : start ? [weekdayOf(start)] : [],
      dayOverrides: {},
    });
  };

  const changeStartDate = (value: string) => {
    const keepEnd = schedule.endDate && value && schedule.endDate >= value;
    updateSchedule({
      startDate: value,
      endDate: !value || schedule.preset === "single" || schedule.preset === "monthly"
        ? ""
        : keepEnd ? schedule.endDate : addDaysIso(value, schedule.preset === "daily" ? 6 : 27),
      // Chỉ tự đổi thứ khi người dùng chưa chọn thêm thứ nào khác.
      weekdays: value && schedule.weekdays.length <= 1 ? [weekdayOf(value)] : schedule.weekdays,
      dayOverrides: {},
    });
  };

  const toggleWeekday = (weekday: number) => {
    const next = schedule.weekdays.includes(weekday)
      ? schedule.weekdays.filter((item) => item !== weekday)
      : [...schedule.weekdays, weekday].sort();
    if (!next.length) {
      toast.error("Cần chọn ít nhất một thứ trong tuần");
      return;
    }
    updateSchedule({ weekdays: next });
  };

  const togglePatternSlot = (slot: string) => {
    updateSchedule({ slots: schedule.slots.includes(slot) ? schedule.slots.filter((item) => item !== slot) : sortSlots([...schedule.slots, slot]) });
  };

  const removePatternFrame = (frame: TimeFrame) => {
    const cells = new Set(cellsOf(frame.time, frame.duration));
    updateSchedule({ slots: schedule.slots.filter((slot) => !cells.has(slot)) });
  };

  const setDaySlots = (date: string, slots: string[] | undefined) => {
    setSchedule((current) => {
      const dayOverrides = { ...current.dayOverrides };
      if (slots === undefined) delete dayOverrides[date];
      else dayOverrides[date] = sortSlots(slots);
      return { ...current, dayOverrides };
    });
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
      } catch {
        setField(null);
        setCourts([]);
        setCourtId(null);
        toast.error("Không tìm thấy cơ sở hoặc sân đang chọn");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [fieldIdParam, courtIdParam]);

  const selectedCourt = courts.find((c) => c.id === courtId);
  const targetCourtIds = useMemo(
    () => bookingMode === "full_field" ? courts.map((court) => court.id) : courtId ? [courtId] : [],
    [bookingMode, courts, courtId]
  );

  const fetchKey = scheduleDates.join(",");
  const refreshBookings = useCallback(async (force = false) => {
    if (!fetchKey) return;
    const dates = fetchKey.split(",");
    try {
      const lists = await Promise.all(dates.map((item) => getBookingsByDate(item, force)));
      setBookingsByDate(Object.fromEntries(dates.map((item, index) => [item, lists[index]])));
    } catch {
      // Giữ nguyên dữ liệu hiện có khi mạng lỗi để không vô tình mở lại ca đã giữ.
    }
  }, [fetchKey]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  // Khi khách quay lại từ Paygate hoặc có người khác vừa tạo đơn, lấy dữ liệu
  // mới từ API thay vì đợi người dùng F5 trang.
  useEffect(() => {
    if (!fetchKey) return;
    const refresh = () => refreshBookings(true);
    window.addEventListener("focus", refresh);
    window.addEventListener("booking:created", refresh);
    const interval = window.setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("booking:created", refresh);
      window.clearInterval(interval);
    };
  }, [fetchKey, refreshBookings]);

  const courtBookings = useCallback((date: string) => (bookingsByDate[date] || []).filter((booking) =>
    booking.status !== "cancelled" &&
    targetCourtIds.some((id) => booking.courtId === id || booking.reservedCourtIds?.includes(id))
  ), [bookingsByDate, targetCourtIds]);

  const isBookedAt = useCallback((date: string, time: string, duration: number) =>
    courtBookings(date).some((booking) => rangesOverlap(booking.time, Number(booking.duration || 1), time, duration)),
  [courtBookings]);

  const availabilityFor = (dates: string[]) => (slot: string): SlotAvailability => {
    let booked = 0;
    let past = 0;
    dates.forEach((item) => {
      if (isPastVietnamSlot(item, slot, clockNow)) past += 1;
      else if (isBookedAt(item, slot, 0.5)) booked += 1;
    });
    return { booked, past, total: dates.length };
  };

  const conflictByKey = useMemo(
    () => new Map(availabilityConflicts.map((conflict) => [conflict.date + "|" + conflict.time, conflict])),
    [availabilityConflicts]
  );

  const frameIssue = (date: string, frame: TimeFrame): FrameIssue | null => {
    if (isPastVietnamSlot(date, frame.time, clockNow)) return "past";
    if (frame.duration < MIN_FRAME_HOURS) return "short";
    if (frame.duration > MAX_FRAME_HOURS) return "long";
    if (conflictByKey.has(date + "|" + frame.time) || isBookedAt(date, frame.time, frame.duration)) return "booked";
    return null;
  };
  const issueCounts = scheduleDays.reduce((counts, day) => {
    day.frames.forEach((frame) => {
      const issue = frameIssue(day.date, frame);
      if (issue) counts[issue] += 1;
    });
    return counts;
  }, { booked: 0, past: 0, short: 0, long: 0 } as Record<FrameIssue, number>);
  const totalIssues = issueCounts.booked + issueCounts.past + issueCounts.short + issueCounts.long;

  // Gợi ý giờ từ server, bỏ các giờ chồng lên khung khác của chính ngày đó.
  const suggestionsFor = (date: string, frame: TimeFrame, daySlots: string[]) => {
    const own = new Set(cellsOf(frame.time, frame.duration));
    const others = new Set(daySlots.filter((slot) => !own.has(slot)));
    return (conflictByKey.get(date + "|" + frame.time)?.suggestions || [])
      .filter((suggestion) => cellsOf(suggestion, frame.duration).every((cell) => timeSlotSet.has(cell) && !others.has(cell)));
  };

  const moveFrame = (date: string, frame: TimeFrame, daySlots: string[], nextTime: string) => {
    const own = new Set(cellsOf(frame.time, frame.duration));
    setDaySlots(date, [...daySlots.filter((slot) => !own.has(slot)), ...cellsOf(nextTime, frame.duration)]);
  };

  const courtPrice = bookingMode === "full_field"
    ? courts.reduce((sum, court) => sum + Number(court.price || 0), 0)
    : selectedCourt?.price ?? field?.pricePerHour ?? 0;
  const scheduledHours = selectedOccurrences.reduce((sum, occurrence) => sum + occurrence.duration, 0);
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

  const focusReview = () => window.requestAnimationFrame(() => reviewRef.current?.focus());

  const checkScheduleAvailability = async (): Promise<boolean> => {
    if (!selectedCourt || !selectedOccurrences.length) return false;
    setCheckingAvailability(true);
    try {
      const response = await api.post<{ available: boolean; conflicts: AvailabilityConflict[] }>("/bookings/check-availability", {
        courtId: selectedCourt.id,
        bookingMode,
        duration: selectedOccurrences[0].duration,
        occurrences: selectedOccurrences,
      });
      setAvailabilityConflicts(response.data.conflicts);
      setAvailabilityChecked(true);
      if (!response.data.available) {
        toast.error("Có " + response.data.conflicts.length + " khung giờ bị trùng. Hãy sửa giờ những ngày được đánh dấu đỏ.");
        focusReview();
      } else {
        toast.success("Tất cả khung giờ đang còn trống");
      }
      void refreshBookings(true);
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

  /** Trả về thông báo lỗi đầu tiên của lịch, hoặc null nếu lịch hợp lệ. */
  const scheduleError = (): string | null => {
    if (!selectedCourt) return "Vui lòng chọn sân trước khi tiếp tục";
    if (!schedule.startDate) return "Vui lòng chọn ngày đặt sân";
    if ((schedule.preset === "daily" || schedule.preset === "weekly") && (!schedule.endDate || schedule.endDate < schedule.startDate)) {
      return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu";
    }
    if (tooManyDates) return `Lịch có hơn ${MAX_OCCURRENCES} ngày. Hãy rút ngắn khoảng thời gian.`;
    if (!selectedOccurrences.length) return "Vui lòng chọn ít nhất một khung giờ";
    if (selectedOccurrences.length > MAX_OCCURRENCES) return `Tối đa ${MAX_OCCURRENCES} khung giờ cho một đơn (hiện có ${selectedOccurrences.length})`;
    if (bookingMode === "full_field" && courts.length < 2) return "Cơ sở cần ít nhất 2 sân con đang hoạt động để bao sân";
    if (issueCounts.short) return `Có ${issueCounts.short} khung giờ ngắn hơn ${MIN_FRAME_HOURS} giờ. Hãy chọn thêm ô hoặc bỏ khung đó.`;
    if (issueCounts.long) return `Mỗi khung giờ tối đa ${MAX_FRAME_HOURS} giờ`;
    if (issueCounts.past) return `Có ${issueCounts.past} khung giờ đã qua. Hãy sửa hoặc bỏ những ngày đó.`;
    if (issueCounts.booked) return `Có ${issueCounts.booked} khung giờ đã có người đặt. Hãy sửa giờ những ngày được đánh dấu đỏ.`;
    return null;
  };

  const advanceStep = async () => {
    if (currentStep === 1) {
      const error = scheduleError();
      if (error) {
        toast.error(error);
        if (selectedOccurrences.length) focusReview();
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
    const error = scheduleError();
    if (error) {
      toast.error(error);
      goToStep(1);
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

    const user = getUser();
    setLoading(true);

    if (!(await checkScheduleAvailability())) {
      setLoading(false);
      goToStep(1);
      return;
    }

    const services = [];
    if (balls > 0) services.push({ name: "Bóng rổ", quantity: balls, price: 20000 });
    if (bibs > 0) services.push({ name: "Áo pitch", quantity: bibs, price: 10000 });
    if (water > 0) services.push({ name: "Nước lọc", quantity: water, price: 10000 });
    if (mineralWater > 0) services.push({ name: "Nước muối khoáng", quantity: mineralWater, price: 15000 });

    const firstOccurrence = selectedOccurrences[0];
    const payload = {
      fieldId: field.id,
      courtId: selectedCourt.id,
      fieldName: field.name,
      court: selectedCourt.name,
      date: firstOccurrence.date,
      recurringDates,
      occurrences: selectedOccurrences,
      // Giữ nguyên cấu hình lịch để quay lại từ trang thanh toán vẫn sửa tiếp được.
      scheduleDraft: schedule,
      bookingMode,
      time: firstOccurrence.time,
      duration: firstOccurrence.duration,
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
      for (const bookedDate of recurringDates) {
        invalidateApiCache(`bookings:date:${bookedDate}`);
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
        await refreshBookings(true);
        goToStep(1);
      } else {
        toast.error(errorMessage || "Tạo đơn đặt sân thất bại. Vui lòng thử lại!");
      }
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10" aria-busy="true">
        <span className="sr-only">Đang chuẩn bị trang đặt sân...</span>
        <div className="mx-auto max-w-7xl">
          <div className="skeleton mb-4 h-4 w-64" />
          <div className="skeleton mb-8 h-10 w-80 max-w-full" />
          <div className="skeleton mb-8 h-20 w-full rounded-3xl" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="skeleton h-64 rounded-3xl" />
              <div className="skeleton h-96 rounded-3xl" />
            </div>
            <div className="skeleton h-96 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!fieldIdParam || !field) {
    return (
      <div className="min-h-[62vh] bg-surface brand-grid flex items-center justify-center px-4 py-16">
        <div className="card max-w-lg w-full p-10 text-center animate-scale-in">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <MapPin className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-extrabold text-stone-950 mb-2">Chưa chọn sân bóng rổ</h2>
          <p className="text-stone-600 mb-7">Vui lòng chọn sân trước khi thực hiện đặt lịch.</p>
          <Link to="/fields" className="btn-primary min-h-12 px-6 rounded-xl">
            Tìm sân ngay <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[70vh] bg-surface brand-grid px-4 py-16">
        <div className="card mx-auto max-w-lg overflow-hidden text-center animate-scale-in">
          <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 px-8 pb-10 pt-10 text-white">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[24px] border-white/10" aria-hidden="true" />
            <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white text-brand-600 shadow-lift">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="relative text-2xl font-extrabold">
              {location.state?.isAutoTransfer ? "Chuyển khoản thành công!" : "Đặt sân thành công!"}
            </h2>
            <p className="relative mt-2 text-sm text-white/90">
              Mã đơn của bạn: <span className="rounded-lg bg-white/20 px-2 py-0.5 font-mono text-base font-extrabold tracking-wide">{success.code}</span>
            </p>
          </div>

          <div className="p-8">
            <div className="rounded-2xl border border-dashed border-stone-300 bg-surface p-5 mb-7">
              {success.checkinQrUrl ? (
                <img src={success.checkinQrUrl} alt={`Mã QR check-in cho đơn ${success.code}`} className="w-44 h-44 mx-auto object-contain rounded-xl bg-white p-2 ring-1 ring-stone-200" />
              ) : (
                <QrCode className="w-40 h-40 mx-auto text-brand-500" aria-hidden="true" />
              )}
              <p className="text-xs text-stone-600 mt-3 font-medium">
                Vui lòng xuất trình mã QR này khi check-in tại quầy lễ tân sân bóng.
              </p>
            </div>

            <div className="space-y-3">
              <Link to="/my-bookings" className="btn-primary w-full min-h-12 rounded-xl">
                Xem đơn đặt sân của tôi
              </Link>
              <Link to="/" className="btn-outline w-full min-h-12 rounded-xl text-sm">
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const STEPS = [
    { step: 1, label: "Lịch sân", desc: "Sân & thời gian" },
    { step: 2, label: "Thông tin", desc: "Dịch vụ & liên hệ" },
    { step: 3, label: "Xác nhận", desc: "Thanh toán" },
  ];

  const ctaContent = loading || checkingAvailability ? (
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
  );

  return (
    <div className="min-h-screen bg-surface text-stone-700 pt-8 pb-32 px-4 lg:pb-16">
      <div className="max-w-7xl mx-auto">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-stone-500">
          <Link to="/" className="rounded-md px-1 py-0.5 hover:text-brand-700 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
          <Link to={`/detail/${field.id}`} className="rounded-md px-1 py-0.5 hover:text-brand-700 transition-colors line-clamp-1 max-w-[12rem] sm:max-w-none">{field.name}</Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
          <span className="px-1 text-brand-700" aria-current="page">Đặt lịch thi đấu</span>
        </nav>

        <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up">
          <div>
            <p className="eyebrow">Đặt sân trực tuyến</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-950 md:text-4xl">Đặt lịch thi đấu</h1>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-stone-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
              <span><strong className="font-bold text-stone-800">{field.name}</strong> · {field.address}</span>
            </p>
          </div>
          <span className="chip w-fit"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Giữ chỗ tức thì · huỷ miễn phí trước 2 giờ</span>
        </header>

        <div className="card mb-8 p-3 md:p-4" aria-label={`Bước ${currentStep} trên 3`}>
          <ol className="grid grid-cols-3 gap-2 md:gap-3">
            {STEPS.map((item) => {
              const active = currentStep === item.step;
              const done = currentStep > item.step;
              return (
                <li key={item.step} className="relative">
                  <button
                    type="button"
                    disabled={item.step > currentStep}
                    onClick={() => item.step < currentStep && goToStep(item.step)}
                    className={`relative flex w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2.5 text-center transition-all duration-300 sm:flex-row sm:gap-3 sm:px-3 sm:text-left ${active ? "bg-brand-50 ring-1 ring-brand-200" : done ? "hover:bg-stone-50" : ""} ${item.step <= currentStep ? "cursor-pointer" : "cursor-not-allowed"}`}
                    aria-current={active ? "step" : undefined}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black transition-colors duration-300 ${active ? "bg-brand-600 text-white shadow-brand" : done ? "bg-brand-100 text-brand-700" : "bg-stone-100 text-stone-500"}`}>
                      {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : item.step}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-xs font-extrabold sm:text-sm ${active ? "text-stone-950" : done ? "text-stone-800" : "text-stone-500"}`}>{item.label}</span>
                      <span className="hidden text-xs text-stone-500 md:block">{item.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mx-2.5 mt-3 h-1 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width] duration-700 ease-[var(--ease-out-expo)]" style={{ width: `${(currentStep / 3) * 100}%` }} />
          </div>
        </div>

        <form id="booking-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          <div key={currentStep} className="lg:col-span-2 space-y-6 animate-fade-in-up">
            {currentStep === 1 && <>
            <section className="card p-5 sm:p-6 md:p-8">
              <SectionTitle icon={<MapPin className="h-5 w-5" />} eyebrow="Bước 1" title="Chọn sân đấu" desc="Đặt một sân con hoặc bao trọn cơ sở cho giải đấu, sự kiện." />

              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBookingMode("court")}
                  aria-pressed={bookingMode === "court"}
                  className={optionCard(bookingMode === "court")}
                >
                  <OptionCheck active={bookingMode === "court"} />
                  <span className="block pr-7 text-sm font-extrabold text-stone-900">Đặt một sân con</span>
                  <span className="mt-1 block text-xs text-stone-600">Chọn một sân theo mức giá riêng</span>
                </button>
                <button
                  type="button"
                  disabled={courts.length < 2}
                  onClick={() => setBookingMode("full_field")}
                  aria-pressed={bookingMode === "full_field"}
                  className={`${optionCard(bookingMode === "full_field")} disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50 disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0`}
                >
                  <OptionCheck active={bookingMode === "full_field"} />
                  <span className="block pr-7 text-sm font-extrabold text-stone-900">Bao toàn bộ sân</span>
                  <span className="mt-1 block text-xs text-stone-600">Giữ đồng thời {courts.length} sân con · {formatCurrency(courts.reduce((sum, court) => sum + Number(court.price || 0), 0))}/giờ</span>
                </button>
              </div>

              {bookingMode === "full_field" && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-fade-in" role="status">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span><strong>Đã chọn toàn bộ {courts.length} sân con.</strong> Khung giờ chỉ có thể chọn khi tất cả các sân con đều đang trống và tổng tiền sẽ cộng giá của cả {courts.length} sân.</span>
                </div>
              )}

              {courts.length === 0 ? (
                <div role="alert" className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm font-semibold text-brand-800">
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
                      aria-pressed={active}
                      className={`${optionCard(active)} disabled:cursor-default disabled:hover:translate-y-0`}
                    >
                      <OptionCheck active={active} />
                      <div className="mb-1 pr-7 text-sm font-extrabold text-stone-900 line-clamp-1">{c.name}</div>
                      <div className={`text-xs font-bold ${active ? "text-brand-700" : "text-stone-600"}`}>
                        {bookingMode === "full_field" ? "Đã nằm trong gói bao sân" : formatCurrency(c.price) + " / giờ"}
                      </div>
                    </button>
                  );
                })}
              </div>}
            </section>

            <section className="card p-5 sm:p-6 md:p-8">
              <SectionTitle icon={<CalendarDays className="h-5 w-5" />} eyebrow="Bước 2" title="Thời gian đặt sân" desc="Chọn kiểu lịch, ngày chơi rồi bấm các ô 30 phút để tạo khung giờ." />

              <div className="mb-6">
                <div className={labelClass}>Kiểu lịch</div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {PRESET_OPTIONS.map((option) => {
                    const active = schedule.preset === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => changePreset(option.id)}
                        className={`${optionCard(active)} min-h-20`}
                        aria-pressed={active}
                      >
                        <OptionCheck active={active} />
                        <span className="block pr-6 text-sm font-extrabold text-stone-950">{option.label}</span>
                        <span className="mt-1 block text-xs leading-snug text-stone-600">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-stone-200 bg-surface p-4 sm:p-5">
                <SubStep index={1} icon={<CalendarDays className="h-4 w-4" />} title="Chọn ngày" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>{schedule.preset === "single" ? "Ngày chơi" : "Từ ngày"}</span>
                    <input
                      type="date"
                      value={schedule.startDate}
                      min={todayIso}
                      onChange={(event) => changeStartDate(event.target.value)}
                      className={inputClass}
                      style={{ colorScheme: "light" }}
                    />
                  </label>
                  {(schedule.preset === "daily" || schedule.preset === "weekly") && (
                    <label className="block">
                      <span className={labelClass}>Đến ngày</span>
                      <input
                        type="date"
                        value={schedule.endDate}
                        min={schedule.startDate || todayIso}
                        max={schedule.startDate ? addDaysIso(schedule.startDate, 365) : undefined}
                        disabled={!schedule.startDate}
                        onChange={(event) => updateSchedule({ endDate: event.target.value, dayOverrides: {} })}
                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-stone-100`}
                        style={{ colorScheme: "light" }}
                      />
                    </label>
                  )}
                  {schedule.preset === "monthly" && (
                    <label className="block">
                      <span className={labelClass}>Số tháng</span>
                      <select
                        value={schedule.months}
                        onChange={(event) => updateSchedule({ months: Number(event.target.value), dayOverrides: {} })}
                        className={inputClass}
                      >
                        {Array.from({ length: 11 }, (_, index) => index + 2).map((value) => <option key={value} value={value}>{value} tháng</option>)}
                      </select>
                    </label>
                  )}
                </div>

                {schedule.preset === "weekly" && (
                  <fieldset className="mt-4">
                    <legend className={labelClass}>Lặp vào các thứ</legend>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                        const active = schedule.weekdays.includes(weekday);
                        return (
                          <button
                            key={weekday}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleWeekday(weekday)}
                            className={`min-h-11 min-w-12 rounded-xl border px-3 text-sm font-bold transition-all duration-200 active:scale-95 ${active ? "border-brand-600 bg-brand-600 text-white shadow-brand" : "border-stone-200 bg-white text-stone-700 hover:border-brand-300 hover:bg-brand-50"}`}
                          >
                            {WEEKDAY_LABELS[weekday]}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {schedule.startDate && (
                  <p className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${tooManyDates ? "bg-rose-50 text-rose-700" : "bg-white text-stone-700 ring-1 ring-stone-200"}`} role={tooManyDates ? "alert" : undefined}>
                    {tooManyDates ? <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> : <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />}
                    {tooManyDates
                      ? `Lịch đang có hơn ${MAX_OCCURRENCES} ngày — hãy rút ngắn khoảng thời gian.`
                      : schedule.preset === "single"
                        ? formatDateVi(schedule.startDate)
                        : schedule.preset === "monthly"
                          ? `Ngày ${Number(schedule.startDate.slice(8))} hằng tháng · ${scheduleDates.length} ngày (tháng thiếu ngày sẽ lấy ngày cuối tháng)`
                          : `${scheduleDates.length} ngày · ${scheduleDates[0] ? formatDateVi(scheduleDates[0]) : ""} → ${scheduleDates.length ? formatDateVi(scheduleDates[scheduleDates.length - 1]) : ""}`}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-stone-200 bg-surface p-4 sm:p-5">
                <SubStep
                  index={2}
                  icon={<Clock className="h-4 w-4" />}
                  title="Chọn khung giờ"
                  action={patternSlots.length > 0 && (
                    <button type="button" onClick={() => updateSchedule({ slots: [] })} className="btn-ghost min-h-11 rounded-lg px-3 text-xs">
                      <X className="h-3.5 w-3.5" aria-hidden="true" /> Bỏ chọn tất cả
                    </button>
                  )}
                />
                <p className="mb-4 text-xs leading-5 text-stone-600">
                  Bấm các ô 30 phút để chọn giờ chơi; các ô liền nhau tạo thành một khung. Có thể chọn nhiều khung trong cùng một buổi.
                  {scheduleDates.length > 1 && ` Khung giờ áp dụng cho ${patternDates.length} ngày; ô viền đỏ nét đứt là giờ đã có người đặt ở một số ngày, bạn có thể sửa riêng những ngày đó ở lịch bên dưới.`}
                </p>
                {!selectedCourt || !schedule.startDate || tooManyDates ? (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center">
                    <Clock className="h-7 w-7 text-stone-300" aria-hidden="true" />
                    <p className="text-sm font-semibold text-stone-600">
                      {!selectedCourt ? "Chọn sân trước để xem giờ trống." : tooManyDates ? "Rút ngắn lịch để chọn giờ." : "Chọn ngày trước để xem giờ trống."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 sm:p-4">
                    <BookingSlotGrid
                      slots={timeSlots}
                      selected={new Set(patternSlots)}
                      availability={availabilityFor(patternDates)}
                      onToggle={togglePatternSlot}
                    />
                  </div>
                )}

                {patternSlots.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Các khung giờ đã chọn">
                    <span className="text-xs font-bold text-stone-600">Khung đã chọn:</span>
                    {slotsToFrames(patternSlots).map((frame) => (
                      <span key={frame.time} className={`inline-flex min-h-9 items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-xs font-bold animate-scale-in ${frame.duration < MIN_FRAME_HOURS ? "border-rose-300 bg-rose-50 text-rose-700" : "border-brand-200 bg-white text-brand-800 shadow-soft"}`}>
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {frameLabel(frame)} · {formatHours(frame.duration)}
                        {frame.duration < MIN_FRAME_HOURS && <span className="text-[10px] font-black uppercase">Tối thiểu {MIN_FRAME_HOURS} giờ</span>}
                        <button type="button" onClick={() => removePatternFrame(frame)} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-brand-50" aria-label={`Bỏ khung ${frameLabel(frame)}`}>
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {bookingMode === "full_field" && (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">Bao sân: ô chỉ trống khi tất cả {courts.length} sân con đều trống.</p>
                )}
              </div>

              {scheduleDays.length > 0 && (schedule.slots.length > 0 || Object.keys(schedule.dayOverrides).length > 0) && (
                <div ref={reviewRef} tabIndex={-1} className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 outline-none focus-visible:ring-4 focus-visible:ring-brand-200 sm:p-5 animate-fade-in" aria-labelledby="schedule-review-title">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-[11px] font-black text-white">3</span>
                      <h3 id="schedule-review-title" className="text-sm font-extrabold text-stone-950">Kiểm tra lại toàn bộ lịch</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                      <span className="rounded-full bg-white px-3 py-1 text-stone-700 ring-1 ring-stone-200">{recurringDates.length} ngày</span>
                      <span className="rounded-full bg-white px-3 py-1 text-stone-700 ring-1 ring-stone-200">{selectedOccurrences.length} khung giờ</span>
                      <span className="rounded-full bg-brand-600 px-3 py-1 text-white">{formatHours(scheduledHours)}</span>
                    </div>
                  </div>

                  {totalIssues > 0 ? (
                    <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-xs font-semibold leading-5 text-rose-800 shadow-soft">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600"><AlertTriangle className="h-4 w-4" aria-hidden="true" /></span>
                      <span className="pt-1">
                        {[
                          issueCounts.booked && `${issueCounts.booked} khung giờ đã có người đặt`,
                          issueCounts.past && `${issueCounts.past} khung giờ đã qua`,
                          issueCounts.short && `${issueCounts.short} khung ngắn hơn ${MIN_FRAME_HOURS} giờ`,
                          issueCounts.long && `${issueCounts.long} khung dài hơn ${MAX_FRAME_HOURS} giờ`,
                        ].filter(Boolean).join(" · ")}. Bấm “Sửa giờ” ở ngày được đánh dấu đỏ hoặc bỏ ngày đó.
                      </span>
                    </div>
                  ) : availabilityChecked ? (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 animate-scale-in">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tất cả khung giờ đang còn trống
                    </p>
                  ) : null}

                  <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {scheduleDays.map((day) => {
                      const removed = day.customized && day.slots.length === 0;
                      const dayHasIssue = day.frames.some((frame) => frameIssue(day.date, frame));
                      return (
                        <li key={day.date} className={`rounded-2xl border p-3 transition-colors sm:p-3.5 ${removed ? "border-dashed border-stone-300 bg-white/60" : dayHasIssue ? "border-rose-300 bg-rose-50/70 ring-1 ring-rose-100" : "border-stone-200 bg-white"}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 text-sm font-extrabold ${removed ? "text-stone-500 line-through" : "text-stone-900"}`}>
                                  <span className={`h-2 w-2 rounded-full ${removed ? "bg-stone-300" : dayHasIssue ? "bg-rose-500" : "bg-emerald-500"}`} aria-hidden="true" />
                                  {formatDateVi(day.date)}
                                </span>
                                {removed && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-black uppercase text-stone-700">Đã bỏ</span>}
                                {day.customized && !removed && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black uppercase text-brand-800">Sửa riêng</span>}
                              </div>
                              {!removed && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {day.frames.length === 0 && <span className="text-xs font-semibold text-stone-500">Chưa chọn giờ</span>}
                                  {day.frames.map((frame) => {
                                    const issue = frameIssue(day.date, frame);
                                    const suggestions = issue === "booked" ? suggestionsFor(day.date, frame, day.slots) : [];
                                    return (
                                      <div key={frame.time} className="flex flex-col gap-1.5">
                                        <span className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-extrabold tabular-nums ${issue ? "border-rose-300 bg-white text-rose-700" : "border-stone-200 bg-stone-50 text-stone-800"}`}>
                                          {issue && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">{FRAME_ISSUE_LABELS[issue]}</span>}
                                          {frameLabel(frame)} · {formatHours(frame.duration)}
                                        </span>
                                        {suggestions.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-600">
                                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Gợi ý:
                                            {suggestions.slice(0, 4).map((suggestion) => (
                                              <button key={suggestion} type="button" onClick={() => moveFrame(day.date, frame, day.slots, suggestion)} className="min-h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 font-extrabold text-emerald-800 transition hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-100">
                                                {suggestion}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {removed ? (
                                <button type="button" onClick={() => setDaySlots(day.date, undefined)} className="btn-outline min-h-11 rounded-xl px-3 text-xs">
                                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Khôi phục
                                </button>
                              ) : (
                                <>
                                  <button type="button" onClick={() => setEditingDay({ date: day.date, slots: day.slots })} className={`min-h-11 inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${dayHasIssue ? "btn-primary" : "border border-brand-200 bg-white text-brand-800 hover:bg-brand-50"}`} aria-label={`Sửa giờ ngày ${formatDateVi(day.date)}`}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Sửa giờ
                                  </button>
                                  {day.customized && (
                                    <button type="button" onClick={() => setDaySlots(day.date, undefined)} className="btn-outline min-h-11 rounded-xl px-3 text-xs" aria-label={`Đưa ngày ${formatDateVi(day.date)} về giờ chung`}>
                                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Theo giờ chung
                                    </button>
                                  )}
                                  {scheduleDays.length > 1 && (
                                    <button type="button" onClick={() => setDaySlots(day.date, [])} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50" aria-label={`Bỏ ngày ${formatDateVi(day.date)}`}>
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Bỏ ngày
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => void checkScheduleAvailability()}
                      disabled={checkingAvailability || !selectedOccurrences.length}
                      className="btn-outline min-h-11 shrink-0 rounded-xl px-4 text-sm disabled:opacity-40"
                    >
                      {checkingAvailability ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                      {checkingAvailability ? "Đang kiểm tra..." : "Kiểm tra lại với hệ thống"}
                    </button>
                    <span className="text-xs leading-5 text-stone-600">Bấm “Tiếp tục” để xác nhận lịch; hệ thống sẽ kiểm tra trùng lần cuối.</span>
                  </div>
                </div>
              )}
            </section>

            </>}

            {currentStep === 2 && <>
            <section className="card p-5 sm:p-6 md:p-8">
              <SectionTitle icon={<Sparkles className="h-5 w-5" />} eyebrow="Tuỳ chọn" title="Dịch vụ & dụng cụ thêm" desc="Chuẩn bị sẵn tại sân khi bạn đến." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "Thuê bóng thi đấu", price: "20.000đ / quả", val: balls, set: setBalls },
                  { name: "Thuê áo pitch chia đội", price: "10.000đ / áo", val: bibs, set: setBibs },
                  { name: "Nước khoáng lạnh", price: "10.000đ / chai", val: water, set: setWater },
                  { name: "Nước muối điện giải", price: "15.000đ / chai", val: mineralWater, set: setMineralWater },
                ].map((s, idx) => (
                  <div key={idx} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${s.val > 0 ? "border-brand-300 bg-brand-50/60" : "border-stone-200 bg-white"}`}>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 text-sm">{s.name}</div>
                      <div className="text-xs text-brand-700 font-bold mt-0.5">{s.price}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-stone-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => s.set(Math.max(0, s.val - 1))}
                        disabled={s.val === 0}
                        aria-label={`Giảm ${s.name}`}
                        className="grid h-10 w-10 place-items-center rounded-lg text-lg font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 active:scale-90 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="min-w-[24px] text-center text-sm font-extrabold tabular-nums text-stone-900" aria-live="polite">{s.val}</span>
                      <button
                        type="button"
                        onClick={() => s.set(s.val + 1)}
                        aria-label={`Thêm ${s.name}`}
                        className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-lg font-bold text-brand-700 transition hover:bg-brand-100 active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5 sm:p-6 md:p-8">
              <SectionTitle icon={<UserRound className="h-5 w-5" />} eyebrow="Liên hệ" title="Thông tin người đặt" desc="Sân sẽ liên hệ qua số điện thoại này khi cần." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="booking-fullname" className={labelClass}>Họ và tên <span className="text-rose-600">*</span></label>
                  <input
                    id="booking-fullname"
                    name="fullName"
                    value={customer.fullName}
                    onChange={handleCustomerChange}
                    autoComplete="name"
                    className={inputClass}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label htmlFor="booking-phone" className={labelClass}>Số điện thoại <span className="text-rose-600">*</span></label>
                  <input
                    id="booking-phone"
                    name="phone"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    inputMode="tel"
                    autoComplete="tel"
                    className={inputClass}
                    placeholder="0987xxxxxx"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-note" className={labelClass}>Ghi chú yêu cầu thêm</label>
                <textarea
                  id="booking-note"
                  name="note"
                  rows={3}
                  value={customer.note}
                  onChange={handleCustomerChange}
                  className={`${inputClass} resize-none py-3`}
                  placeholder="Yêu cầu chuẩn bị sân, bóng mới..."
                />
              </div>
            </section>

            </>}

            {currentStep === 3 && <>
            <section className="card p-5 sm:p-6 md:p-8">
              <SectionTitle icon={<Wallet className="h-5 w-5" />} eyebrow="Thanh toán" title="Phương thức thanh toán" desc="Chọn cách thanh toán phù hợp với bạn." />

              <fieldset
                id="payment-methods"
                aria-describedby={paymentError ? "payment-method-error" : undefined}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                <legend className="sr-only">Chọn phương thức thanh toán</legend>
                {[
                  {
                    id: "deposit",
                    title: "Đặt cọc (30%)",
                    desc: "Giữ sân trước, thanh toán 70% còn lại sau",
                    badge: "Phổ biến",
                    icon: ShieldCheck,
                  },
                  {
                    id: "full",
                    title: "Thanh toán 100%",
                    desc: "Thẻ ATM, Visa, QR VNPay",
                    badge: "Nhanh nhất",
                    icon: QrCode,
                  },
                  {
                    id: "cash",
                    title: "Tiền mặt tại sân",
                    desc: "Thanh toán trực tiếp khi đến",
                    badge: "Linh hoạt",
                    icon: Wallet,
                  },
                ].map((item) => {
                  const active = paymentMethod === item.id;
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.id}
                      className={`${optionCard(active)} block cursor-pointer p-5 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-200`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={active}
                        onChange={() => {
                          setPaymentMethod(item.id as PaymentMethod);
                          setPaymentError("");
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <span className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"}`}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className={`grid h-5 w-5 place-items-center rounded-full border-2 transition ${active ? "border-brand-600" : "border-stone-300"}`} aria-hidden="true">
                          <span className={`h-2.5 w-2.5 rounded-full bg-brand-600 transition-transform duration-200 ${active ? "scale-100" : "scale-0"}`} />
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-base">{item.title}</span>
                      </div>
                      <div className="text-xs leading-5 text-stone-600 mt-1">{item.desc}</div>
                      <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${active ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                        {item.badge}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="mt-3 min-h-5" aria-live="polite">
                {paymentError && (
                  <p id="payment-method-error" role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {paymentError}
                  </p>
                )}
              </div>
            </section>
            </>}

          </div>

          <aside className="lg:col-span-1 lg:self-stretch" aria-label="Tóm tắt đơn đặt">
            <div className="sticky top-28">
              <div className="card overflow-hidden">
                <div className="relative border-b border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white px-6 pb-5 pt-6 md:px-7">
                  <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-200/40 blur-2xl pointer-events-none" aria-hidden="true" />
                  <p className="eyebrow relative">Đơn của bạn</p>
                  <h3 className="relative mt-1 flex items-center justify-between text-xl font-extrabold text-stone-950">
                    Tóm tắt đơn đặt
                    <Sparkles className="w-5 h-5 text-brand-500" aria-hidden="true" />
                  </h3>
                </div>

                <div className="px-6 py-5 md:px-7">
                  <dl className="space-y-3.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600">Cơ sở</dt>
                      <dd className="text-stone-900 font-bold text-right line-clamp-2">{field.name}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600">Sân đấu</dt>
                      <dd className="text-stone-900 font-bold text-right">{bookingMode === "full_field" ? "Bao toàn bộ sân (" + courts.length + " sân con)" : selectedCourt?.name || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600 flex items-center gap-1.5 shrink-0">
                        <CalendarDays className="w-4 h-4 text-brand-500" aria-hidden="true" /> Ngày
                      </dt>
                      <dd className={`font-bold text-right ${recurringDates[0] ? "text-stone-900" : "text-stone-500"}`}>
                        {recurringDates[0] ? formatDateVi(recurringDates[0]) : "Chưa chọn"} {recurringDates.length > 1 && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800">{recurringDates.length} ngày</span>}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600 flex items-center gap-1.5 shrink-0">
                        <Clock className="w-4 h-4 text-brand-500" aria-hidden="true" /> Giờ chơi
                      </dt>
                      <dd className={`font-bold text-right tabular-nums ${selectedOccurrences.length ? "text-stone-900" : "text-stone-500"}`}>{selectedOccurrences.length === 0 ? "Chưa chọn" : selectedOccurrences.length === 1 ? frameLabel(selectedOccurrences[0]) : selectedOccurrences.length + " khung giờ"} {selectedOccurrences.length > 0 && `(${formatHours(scheduledHours)})`}</dd>
                    </div>
                    {servicesTotal > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-stone-600">Dịch vụ thêm</dt>
                        <dd className="text-stone-900 font-bold">{formatCurrency(servicesTotal)}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 border-t border-dashed border-stone-200 pt-5">
                    <label htmlFor="booking-voucher" className="sr-only">Mã giảm giá</label>
                    <div className="flex gap-2">
                      <div className="relative w-full">
                        <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                        <input
                          id="booking-voucher"
                          value={voucherCode}
                          onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setAppliedVoucher(null); }}
                          placeholder="Mã giảm giá"
                          className="min-h-11 w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold uppercase tracking-wide text-stone-900 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyVoucher}
                        disabled={voucherLoading || !subTotal || !voucherCode.trim()}
                        className="btn-outline min-h-11 px-4 rounded-xl text-xs whitespace-nowrap disabled:opacity-40"
                      >
                        {voucherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5 text-sm">
                    {activeVoucher && (
                      <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800 animate-scale-in">
                        <span className="flex items-center gap-1.5 font-semibold"><Tag size={14} aria-hidden="true" /> Giảm giá voucher</span>
                        <span className="font-extrabold">-{formatCurrency(activeVoucher.discountAmount)}</span>
                      </div>
                    )}

                    {paymentMethod === "deposit" && (
                      <div className="flex justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
                        <span className="text-brand-800 font-bold">Tiền cọc trước (30%)</span>
                        <span className="text-brand-800 font-extrabold text-base">{formatCurrency(deposit)}</span>
                      </div>
                    )}

                    <div className="flex items-end justify-between gap-3 pt-2">
                      <span className="text-stone-600 font-bold">Tổng thanh toán</span>
                      <span className="text-2xl font-black tracking-tight text-stone-950 tabular-nums">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 hidden gap-3 lg:flex">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={() => goToStep(currentStep - 1)}
                        className="btn-outline min-h-14 w-14 shrink-0 rounded-xl"
                        aria-label="Quay lại bước trước"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type={currentStep === 3 ? "submit" : "button"}
                      onClick={currentStep < 3 ? advanceStep : undefined}
                      disabled={loading || checkingAvailability}
                      className="btn-primary min-h-14 w-full rounded-xl text-base disabled:opacity-60"
                    >
                      {ctaContent}
                    </button>
                  </div>

                  <ul className="mt-6 space-y-2.5 border-t border-stone-100 pt-5 text-xs text-stone-600">
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" aria-hidden="true" />
                      Bảo mật giao dịch 100% qua cổng kiểm duyệt
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-600 shrink-0" aria-hidden="true" />
                      Hủy lịch miễn phí trước 2 tiếng thi đấu
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </aside>

          {/* Thanh hành động cố định cho mobile: cùng handler với nút trong tóm tắt.
              Portal ra body vì .page-enter (transform) làm lệch position: fixed. */}
          {createPortal(<div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_-16px_rgb(28_25_23/0.25)] backdrop-blur-lg lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              {currentStep > 1 && (
                <button type="button" onClick={() => goToStep(currentStep - 1)} className="btn-outline min-h-12 w-12 shrink-0 rounded-xl" aria-label="Quay lại bước trước">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
                  {paymentMethod === "deposit" && currentStep === 3 ? "Cọc trước" : "Tổng"} · Bước {currentStep}/3
                </div>
                <div className="truncate text-lg font-black leading-tight text-stone-950 tabular-nums">
                  {formatCurrency(paymentMethod === "deposit" && currentStep === 3 ? deposit : total)}
                </div>
              </div>
              <button
                type={currentStep === 3 ? "submit" : "button"}
                form="booking-form"
                onClick={currentStep < 3 ? advanceStep : undefined}
                disabled={loading || checkingAvailability}
                className="btn-primary min-h-12 shrink-0 rounded-xl px-4 text-sm disabled:opacity-60"
              >
                {loading || checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : currentStep < 3 ? <>Tiếp tục <ChevronRight className="h-4 w-4" /></> : paymentMethod === "cash" ? "Xác nhận" : paymentMethod ? "Thanh toán" : "Chọn thanh toán"}
              </button>
            </div>
          </div>, document.body)}
        </form>
      {editingDay && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-day-title">
          <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-stone-200 bg-white p-5 shadow-lift animate-fade-in-up sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Sửa riêng một ngày</p>
                <h2 id="edit-day-title" className="mt-1 text-xl font-extrabold text-stone-950">Sửa giờ · {formatDateVi(editingDay.date)}</h2>
                <p className="mt-1 text-sm text-stone-600">Chỉ thay đổi ngày này, các ngày khác giữ nguyên. Ô đỏ là giờ đã có người đặt trong ngày.</p>
              </div>
              <button type="button" onClick={() => setEditingDay(null)} className="btn-outline grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl" aria-label="Đóng"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl bg-surface p-3 ring-1 ring-stone-200 sm:p-4">
              <BookingSlotGrid
                slots={timeSlots}
                selected={new Set(editingDay.slots)}
                availability={availabilityFor([editingDay.date])}
                onToggle={(slot) => setEditingDay((current) => current && ({
                  ...current,
                  slots: current.slots.includes(slot) ? current.slots.filter((item) => item !== slot) : sortSlots([...current.slots, slot]),
                }))}
              />
            </div>
            <div className="mt-4 flex min-h-9 flex-wrap gap-2" aria-live="polite">
              {slotsToFrames(editingDay.slots).map((frame) => {
                const issue = frameIssue(editingDay.date, frame);
                return (
                  <span key={frame.time} className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-extrabold tabular-nums ${issue ? "border-rose-300 bg-rose-50 text-rose-700" : "border-brand-200 bg-brand-50 text-brand-800"}`}>
                    {issue && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">{FRAME_ISSUE_LABELS[issue]}</span>}
                    {frameLabel(frame)} · {formatHours(frame.duration)}
                  </span>
                );
              })}
              {editingDay.slots.length === 0 && <span className="text-xs font-semibold text-stone-600">Chưa chọn khung giờ nào — lưu sẽ bỏ ngày này khỏi lịch.</span>}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => setEditingDay(null)} className="btn-ghost min-h-12 flex-1 justify-center rounded-xl px-4 text-sm">Hủy</button>
              <button type="button" onClick={() => setEditingDay((current) => current && { ...current, slots: patternSlots })} className="btn-outline min-h-12 flex-1 rounded-xl px-4 text-sm">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Theo giờ chung
              </button>
              <button type="button" onClick={() => {
                const slots = sortSlots(editingDay.slots);
                const samePattern = slots.length === patternSlots.length && slots.every((slot, index) => slot === patternSlots[index]);
                setDaySlots(editingDay.date, samePattern ? undefined : slots);
                setEditingDay(null);
              }} className="btn-primary min-h-12 flex-1 rounded-xl px-4 text-sm">Lưu ngày này</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}
