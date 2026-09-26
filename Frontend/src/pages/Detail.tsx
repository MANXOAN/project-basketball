import { ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart, Share2, MapPin, Clock, Phone, LayoutGrid, CheckCircle2,
  CalendarDays, Map, ChevronRight, Star, Camera, MessageCircle, X, ArrowLeft, Wrench, ShieldCheck, Timer, MailCheck,
} from "lucide-react";
import { api, Court, Field, formatCurrency, TIME_SLOTS, getBookingsByDate, Booking } from "../lib/api";
import { isPastVietnamSlot, vietnamTodayIso } from "../lib/bookingTime";
import { getFieldGallery, getFieldReviews } from "../data/demoData";
import toast from "react-hot-toast";

// Tiêu đề section dùng chung (chỉ giao diện).
const SectionHeading = ({ icon, eyebrow, title, id, aside }: { icon: ReactNode; eyebrow: string; title: string; id?: string; aside?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div className="flex items-center gap-3.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">{icon}</span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-0.5 text-xl font-extrabold tracking-tight text-stone-950">{title}</h2>
      </div>
    </div>
    {aside}
  </div>
);


export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [field, setField] = useState<Field | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockNow, setClockNow] = useState(Date.now());
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = vietnamTodayIso();
    const requestedDate = searchParams.get("date");
    return requestedDate && requestedDate >= today ? requestedDate : today;
  });
  const todayIso = vietnamTodayIso(clockNow);
  const preferredTime = searchParams.get("time");
  const [bookedByCourt, setBookedByCourt] = useState<Record<number, Booking[]>>({});
  const [savedHeart, setSavedHeart] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const [fRes, cRes] = await Promise.all([
          api.get<Field>(`/fields/${id}`),
          api.get<Court[]>(`/courts`, { params: { fieldId: id } }),
        ]);
        setField(fRes.data);
        setCourts(cRes.data);
      } catch {
        setField(null);
        setCourts([]);
        toast.error("Không tìm thấy cơ sở");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const refreshAvailability = useCallback(async (force = false) => {
    if (!courts.length || !selectedDate) return;
    try {
      const list = await getBookingsByDate(selectedDate, force);
      const map: Record<number, Booking[]> = {};
      for (const c of courts) {
        map[c.id] = list.filter((b) =>
          (b.courtId === c.id || b.reservedCourtIds?.includes(c.id)) && b.status !== "cancelled"
        );
      }
      setBookedByCourt(map);
    } catch {
      // Giữ dữ liệu hiện tại nếu mạng lỗi, tránh báo nhầm sân đang trống.
    }
  }, [courts, selectedDate]);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  // Đồng bộ thay đổi từ API: lập tức khi quay về tab và tối đa 10 giây/lần
  // khi có người khác đang xem cùng ngày/sân.
  useEffect(() => {
    if (!courts.length || !selectedDate) return;
    const refresh = () => refreshAvailability(true);
    window.addEventListener("focus", refresh);
    window.addEventListener("booking:created", refresh);
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("booking:created", refresh);
      window.clearInterval(interval);
    };
  }, [courts.length, selectedDate, refreshAvailability]);

  const isBooked = (courtId: number, slot: string) => {
    const list = bookedByCourt[courtId] || [];
    return list.some((b) => {
      const start = b.time;
      const [h, m] = start.split(":").map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + b.duration * 60;
      const [sh, sm] = slot.split(":").map(Number);
      const slotMin = sh * 60 + sm;
      return slotMin >= startMin && slotMin < endMin;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface px-4 py-8" aria-busy="true">
        <span className="sr-only">Đang tải thông tin cơ sở...</span>
        <div className="mx-auto max-w-7xl">
          <div className="skeleton mb-4 h-4 w-56" />
          <div className="skeleton mb-3 h-10 w-96 max-w-full" />
          <div className="skeleton mb-8 h-5 w-72 max-w-full" />
          <div className="skeleton mb-10 h-72 w-full rounded-3xl md:h-[440px]" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="skeleton h-48 rounded-3xl" />
              <div className="skeleton h-80 rounded-3xl" />
            </div>
            <div className="skeleton h-80 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="min-h-[70vh] bg-surface brand-grid flex items-center justify-center px-4 py-20">
        <div className="card max-w-md w-full p-10 text-center animate-scale-in">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <MapPin className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-950">Không tìm thấy cơ sở này</h1>
          <p className="mt-2 text-stone-600">Cơ sở có thể đã ngừng hoạt động hoặc đường dẫn không đúng.</p>
          <Link to="/fields" className="btn-primary mt-7 min-h-12 rounded-xl px-6">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại tìm sân
          </Link>
        </div>
      </div>
    );
  }

  const activeCourts = courts.filter((c) => c.status === "active");
  const gallery = getFieldGallery(field);
  const reviews = getFieldReviews(field.id);
  const averageRating = field.rating || 4.8;
  const reviewCount = 126 + (field.id % 35);
  const ratingBreakdown = [
    { rating: 5, percent: 82 },
    { rating: 4, percent: 14 },
    { rating: 3, percent: 3 },
    { rating: 2, percent: 1 },
    { rating: 1, percent: 0 },
  ];
  const cardClass = "card p-6 md:p-8";
  return (
    <div className="bg-surface text-stone-700 min-h-screen">
      {/* ── Tiêu đề & ảnh chính ── */}
      <section className="mx-auto max-w-7xl px-4 pt-6 md:pt-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-stone-500">
          <Link to="/" className="rounded-md px-1 py-0.5 transition-colors hover:text-brand-700">Trang chủ</Link>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
          <Link to="/fields" className="rounded-md px-1 py-0.5 transition-colors hover:text-brand-700">Tìm sân</Link>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
          <span className="px-1 text-brand-700" aria-current="page">{field.name}</span>
        </nav>

        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between animate-fade-in-up">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="chip">{field.sportLabel || field.type}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Đang mở cửa
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 md:text-5xl">{field.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" /> {field.address}</span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-brand-500 text-brand-500" aria-hidden="true" />
                <strong className="font-extrabold text-stone-900">{averageRating.toFixed(1)}</strong>
                <span className="text-stone-500">({reviewCount} đánh giá)</span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setSavedHeart(!savedHeart)}
              aria-pressed={savedHeart}
              aria-label={savedHeart ? "Bỏ lưu sân" : "Lưu sân yêu thích"}
              className={`grid h-11 w-11 place-items-center rounded-xl border transition-all active:scale-90 ${savedHeart ? "border-rose-200 bg-rose-50 text-rose-600" : "border-stone-200 bg-white text-stone-700 hover:border-brand-300 hover:text-brand-700"}`}
            >
              <Heart className={`h-5 w-5 transition-transform ${savedHeart ? "scale-110 fill-rose-500" : ""}`} />
            </button>
            <button type="button" aria-label="Chia sẻ sân" className="grid h-11 w-11 place-items-center rounded-xl border border-stone-200 bg-white text-stone-700 transition-all hover:border-brand-300 hover:text-brand-700 active:scale-90">
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/booking?fieldId=${field.id}`)}
              className="btn-primary hidden min-h-11 rounded-xl px-5 text-sm sm:inline-flex"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> Đặt sân ngay
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelectedGalleryImage(field.image || field.imageUrl || gallery[0] || null)}
          className="group zoom-media relative block h-64 w-full overflow-hidden rounded-3xl bg-stone-100 shadow-soft ring-1 ring-stone-200 sm:h-80 md:h-[460px] animate-fade-in"
          aria-label={`Xem ảnh lớn ${field.name}`}
        >
          <img src={field.image || field.imageUrl} alt={field.name} className="h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-stone-950/40 to-transparent" aria-hidden="true" />
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-bold text-stone-800 shadow-soft backdrop-blur">
            <Camera className="h-4 w-4 text-brand-600" aria-hidden="true" /> {gallery.length} ảnh
          </span>
        </button>
      </section>

      {/* ── Nội dung ── */}
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cột trái */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">

            {/* Thông tin nhanh */}
            <section className={cardClass} data-reveal aria-labelledby="about-title">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 pb-8 border-b border-stone-100">
                {[
                  { icon: <Clock className="w-5 h-5" />, label: "Giờ mở cửa", value: `${field.openTime} – ${field.closeTime}` },
                  { icon: <Phone className="w-5 h-5" />, label: "Hotline", value: field.phone, link: `tel:${field.phone}` },
                  { icon: <LayoutGrid className="w-5 h-5" />, label: "Số sân", value: `${courts.length} sân` },
                  { icon: <CheckCircle2 className="w-5 h-5" />, label: "Trạng thái", value: "Đang mở", ok: true },
                ].map((stat, i) => (
                  <div key={i} className="rounded-2xl border border-stone-200 bg-surface p-4">
                    <div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${stat.ok ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600"}`} aria-hidden="true">{stat.icon}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{stat.label}</div>
                    {stat.link ? (
                      <a href={stat.link} className="mt-0.5 block text-sm font-extrabold text-brand-700 transition-colors hover:text-brand-800 hover:underline">{stat.value}</a>
                    ) : (
                      <div className="mt-0.5 text-sm font-extrabold text-stone-900">{stat.value}</div>
                    )}
                  </div>
                ))}
              </div>

              <h2 id="about-title" className="mb-3 text-xl font-extrabold text-stone-950">Giới thiệu cơ sở</h2>
              <p className="text-stone-600 text-sm md:text-base leading-relaxed">{field.description}</p>
            </section>

            {/* Lịch trống */}
            <section className={cardClass} data-reveal aria-labelledby="availability-title">
              <SectionHeading
                icon={<Clock className="h-5 w-5" />}
                eyebrow="Đặt nhanh"
                title="Lịch trống"
                id="availability-title"
                aside={
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-600">
                    <span className="sr-only sm:not-sr-only">Ngày</span>
                    <input
                      type="date"
                      value={selectedDate}
                      min={todayIso}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="input w-auto text-sm font-semibold"
                      style={{ colorScheme: "light" }}
                    />
                  </label>
                }
              />

              <p className="mb-4 text-sm text-stone-600">Bấm vào giờ còn trống để chuyển tới trang đặt sân với giờ đã chọn sẵn.</p>

              {/* Chú thích */}
              <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-stone-600">
                <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-md border border-stone-300 bg-white" aria-hidden="true" /> Còn trống</span>
                <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-md bg-brand-600" aria-hidden="true" /> Giờ bạn chọn</span>
                <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-md border border-rose-200 bg-rose-50" aria-hidden="true" /> Đã có người đặt</span>
                <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-md bg-stone-200" aria-hidden="true" /> Đã qua</span>
              </div>

              {activeCourts.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-surface px-4 py-10 text-center">
                  <LayoutGrid className="h-7 w-7 text-stone-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-stone-600">Hiện chưa có sân nào đang hoạt động.</p>
                </div>
              )}

              <div className="space-y-5">
                {activeCourts.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-stone-200 bg-surface p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-extrabold text-stone-900">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" aria-hidden="true" />
                        {c.name}
                      </div>
                      <div className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-bold text-brand-700">
                        {formatCurrency(c.price)} / giờ
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                      {TIME_SLOTS.map((t) => {
                        const booked = isBooked(c.id, t);
                        const elapsed = isPastVietnamSlot(selectedDate, t, clockNow);
                        const unavailable = booked || elapsed;
                        const preferred = preferredTime === t && !unavailable;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={unavailable}
                            onClick={() => {
                              if (unavailable) return;
                              navigate("/booking?fieldId=" + field.id + "&courtId=" + c.id + "&date=" + selectedDate + "&time=" + t);
                            }}
                            aria-label={(elapsed ? "Đã qua" : booked ? "Đã đặt" : "Đặt") + " " + c.name + " lúc " + t}
                            title={elapsed ? "Đã qua" : booked ? "Đã có người đặt" : "Còn trống — bấm để đặt"}
                            className={`slot-btn min-h-11 rounded-xl border text-center text-[13px] font-bold tabular-nums ${
                              elapsed
                                ? "cursor-not-allowed border-stone-100 bg-stone-100 text-stone-400"
                                : booked
                                ? "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-600 line-through decoration-rose-400"
                                : preferred
                                ? "border-brand-600 bg-brand-600 text-white shadow-brand ring-4 ring-brand-100"
                                : "border-stone-200 bg-white text-stone-800 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(`/booking?fieldId=${field.id}`)}
                className="btn-primary w-full mt-6 min-h-14 rounded-xl text-base"
              >
                <CalendarDays className="w-5 h-5" aria-hidden="true" /> Đặt sân ngay
              </button>
            </section>

            {/* Danh sách sân */}
            <section className={cardClass} data-reveal aria-labelledby="courts-title">
              <SectionHeading icon={<LayoutGrid className="h-5 w-5" />} eyebrow="Sân con" title={`Danh sách sân (${courts.length})`} id="courts-title" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courts.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${
                      c.status === "maintenance"
                        ? "border-rose-200 bg-rose-50/60"
                        : "border-stone-200 bg-white transition-colors hover:border-brand-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 text-base">{c.name}</div>
                      {c.status === "maintenance" ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-rose-700"><Wrench className="h-3.5 w-3.5" aria-hidden="true" /> Đang bảo trì</span>
                      ) : (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Sẵn sàng</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-brand-700 font-extrabold text-base">{formatCurrency(c.price)}</div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">/ giờ</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Thư viện ảnh */}
            <section className={cardClass} data-reveal aria-labelledby="gallery-title">
              <SectionHeading
                icon={<Camera className="h-5 w-5" />}
                eyebrow="Không gian"
                title="Hình ảnh tại sân"
                id="gallery-title"
                aside={<span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600">{gallery.length} ảnh</span>}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedGalleryImage(image)}
                    className={`zoom-media group relative overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200 ${index === 0 ? "col-span-2 md:col-span-2 md:row-span-2 aspect-[16/9] md:aspect-auto" : "aspect-[4/3]"}`}
                    aria-label={`Xem ảnh ${index + 1} của ${field.name}`}
                  >
                    <img src={image} alt={`Không gian ${field.name} - ảnh ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute inset-0 bg-stone-950/0 transition-colors group-hover:bg-stone-950/15" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            {/* Đánh giá */}
            <section className={cardClass} data-reveal aria-labelledby="reviews-title">
              <SectionHeading
                icon={<MessageCircle className="h-5 w-5" />}
                eyebrow="Cộng đồng"
                title="Đánh giá từ người chơi"
                id="reviews-title"
                aside={<span className="text-xs font-medium text-stone-500">Dữ liệu minh hoạ cho bản demo</span>}
              />
              <div className="grid md:grid-cols-[190px_1fr] gap-6 pb-8 mb-8 border-b border-stone-100">
                <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-center text-white shadow-brand">
                  <div className="text-5xl font-extrabold tracking-tight">{averageRating.toFixed(1)}</div>
                  <div className="flex justify-center gap-0.5 my-2" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} className="w-4 h-4 text-white fill-white" />)}
                  </div>
                  <p className="text-xs font-semibold text-white/90">{reviewCount} lượt đánh giá</p>
                </div>
                <div className="flex flex-col justify-center space-y-2.5">
                  {ratingBreakdown.map(({ rating, percent }) => (
                    <div key={rating} className="flex items-center gap-3 text-xs font-bold text-stone-700">
                      <span className="flex w-8 items-center gap-1">{rating} <Star className="w-3.5 h-3.5 text-brand-500 fill-brand-500" aria-hidden="true" /></span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${percent}%` }} /></div>
                      <span className="w-9 text-right text-stone-500">{percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                {reviews.map((review) => (
                  <article key={review.id} className="flex gap-3 sm:gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-800 ring-2 ring-white">{review.initial}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-bold text-stone-900 text-sm">{review.author}</h3>
                        <span className="text-xs text-stone-500">{review.date}</span>
                      </div>
                      <div className="flex gap-0.5 my-1.5" aria-label={`${review.rating} trên 5 sao`}>
                        {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`w-3.5 h-3.5 ${index < review.rating ? "text-brand-500 fill-brand-500" : "text-stone-200"}`} />)}
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Bản đồ */}
            <section className={cardClass} data-reveal aria-labelledby="map-title">
              <SectionHeading icon={<Map className="h-5 w-5" />} eyebrow="Đường đi" title="Vị trí sân" id="map-title" />
              <p className="text-sm text-stone-700 mb-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-surface px-5 py-4">
                <MapPin className="w-5 h-5 text-brand-500 shrink-0" aria-hidden="true" />
                {field.address}
              </p>
              <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 mb-5">
                <iframe
                  title={`Bản đồ ${field.name}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(field.address + ", " + (field.city || "Việt Nam"))}&z=15&output=embed`}
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(field.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary min-h-11 rounded-xl px-6 text-sm"
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Chỉ đường
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline min-h-11 rounded-xl px-6 text-sm"
                >
                  <Map className="w-4 h-4" aria-hidden="true" /> Google Maps
                </a>
              </div>
            </section>
          </div>

          {/* Cột phải – thẻ đặt sân cố định */}
          <aside className="lg:col-span-1" aria-label="Đặt sân">
            <div className="sticky top-28 space-y-6">
              <div className="card overflow-hidden animate-fade-in-up">
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-7 text-white">
                  <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[22px] border-white/10" aria-hidden="true" />
                  <div className="relative text-xs font-bold uppercase tracking-wider text-white/85">Giá thuê sân từ</div>
                  <div className="relative mt-1 text-4xl font-extrabold tracking-tight">
                    {formatCurrency(field.priceFrom || field.pricePerHour || 0)}
                    <span className="ml-1 text-sm font-bold text-white/85">/ giờ</span>
                  </div>
                  <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-sm backdrop-blur">
                    <Star className="h-4 w-4 fill-white text-white" aria-hidden="true" />
                    <span className="font-bold">{averageRating.toFixed(1)}</span>
                    <span className="text-white/85">· {courts.length} sân</span>
                  </div>
                </div>

                <div className="p-6 md:p-7 space-y-3">
                  <button
                    onClick={() => navigate(`/booking?fieldId=${field.id}`)}
                    className="btn-primary w-full min-h-14 rounded-xl text-base"
                  >
                    <CalendarDays className="w-5 h-5" aria-hidden="true" /> Đặt sân ngay
                  </button>
                  <a
                    href={`tel:${field.phone}`}
                    className="btn-outline w-full min-h-12 rounded-xl text-sm"
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" /> Liên hệ: {field.phone}
                  </a>

                  <ul className="mt-5 space-y-3.5 border-t border-stone-100 pt-5">
                    {[
                      { icon: ShieldCheck, text: "Đặt cọc an toàn & bảo mật" },
                      { icon: Timer, text: "Hủy miễn phí trước 2 giờ" },
                      { icon: MailCheck, text: "Xác nhận tức thì qua email" },
                    ].map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-3 text-sm text-stone-700">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                        <span className="font-medium">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-stone-900">
                  <LayoutGrid className="h-4 w-4 text-brand-600" aria-hidden="true" /> Sân đang hoạt động
                </h3>
                <div className="space-y-2">
                  {activeCourts.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-surface p-3 text-sm">
                      <span className="flex items-center gap-2 font-bold text-stone-800">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> {c.name}
                      </span>
                      <span className="font-extrabold text-brand-700">{formatCurrency(c.price)}</span>
                    </div>
                  ))}
                  {activeCourts.length === 0 && <p className="text-sm text-stone-500">Chưa có sân đang hoạt động.</p>}
                  {activeCourts.length > 4 && (
                    <p className="pt-3 text-center text-xs font-bold uppercase tracking-wider text-stone-500">
                      + {activeCourts.length - 4} sân khác
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Thanh đặt nhanh cho mobile */}
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_-16px_rgb(28_25_23/0.25)] backdrop-blur-lg lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Giá từ</div>
              <div className="truncate text-lg font-black leading-tight text-stone-950">{formatCurrency(field.priceFrom || field.pricePerHour || 0)}<span className="text-xs font-bold text-stone-500"> / giờ</span></div>
            </div>
            <button type="button" onClick={() => navigate(`/booking?fieldId=${field.id}`)} className="btn-primary min-h-12 shrink-0 rounded-xl px-5 text-sm">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> Đặt sân ngay
            </button>
          </div>
        </div>,
        document.body
      )}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      {selectedGalleryImage && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/85 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh sân"
          onClick={(event) => event.target === event.currentTarget && setSelectedGalleryImage(null)}
        >
          <button type="button" onClick={() => setSelectedGalleryImage(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white text-stone-900 shadow-lift transition hover:bg-brand-50" aria-label="Đóng ảnh">
            <X className="w-5 h-5" />
          </button>
          <img src={selectedGalleryImage} alt={`Ảnh ${field.name}`} className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl animate-scale-in" />
        </div>,
        document.body
      )}
    </div>
  );
}
