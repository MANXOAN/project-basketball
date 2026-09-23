import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart, Share2, MapPin, Clock, Phone, LayoutGrid, CheckCircle2,
  CalendarDays, Map, Loader2, ChevronRight, Star, Camera, MessageCircle, X,
} from "lucide-react";
import { api, Court, Field, formatCurrency, TIME_SLOTS, getBookingsByDate, Booking } from "../lib/api";
import { getDemoCourts, getDemoField, getFieldGallery, getFieldReviews } from "../data/demoData";
import toast from "react-hot-toast";

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [field, setField] = useState<Field | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() =>
    searchParams.get("date") || new Date().toISOString().slice(0, 10)
  );
  const preferredTime = searchParams.get("time");
  const [bookedByCourt, setBookedByCourt] = useState<Record<number, Booking[]>>({});
  const [savedHeart, setSavedHeart] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

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
        const demoField = getDemoField(id);
        if (demoField) {
          setField(demoField);
          setCourts(getDemoCourts(id));
          toast("Đang hiển thị dữ liệu minh hoạ", { id: "demo-data" });
        } else {
          toast.error("Không tìm thấy cơ sở");
        }
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
        map[c.id] = list.filter((b) => b.courtId === c.id && b.status !== "cancelled");
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
      <div className="flex flex-col items-center justify-center py-36 gap-3 bg-[#f7f8f6] min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-slate-500 text-sm font-medium">Đang tải thông tin cơ sở...</p>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-[#f7f8f6] min-h-screen">
        <div className="text-6xl mb-4 opacity-70">🏟️</div>
        <p className="text-gray-500 mb-6 text-lg">Không tìm thấy cơ sở này</p>
        <Link to="/fields" className="border border-slate-300 bg-white px-6 py-3 rounded-xl font-bold text-sm inline-block shadow-sm text-slate-700 hover:border-amber-400">
          ← Quay lại tìm sân
        </Link>
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

  return (
    <div className="bg-[#f7f8f6] text-slate-700 min-h-screen">
      {/* ── Hero Image ── */}
      <div className="w-full h-80 md:h-[500px] relative overflow-hidden bg-zinc-900 border-b border-white/5">
        <img src={field.image || field.imageUrl} alt={field.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />

        {/* Breadcrumb on image */}
        <div className="absolute top-6 left-4 md:left-8 text-xs text-gray-400 flex items-center gap-2 bg-black/40 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full uppercase tracking-wider font-bold">
          <Link to="/" className="hover:text-yellow-400 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3 h-3 text-gray-500" />
          <Link to="/fields" className="hover:text-yellow-400 transition-colors">Tìm sân</Link>
          <ChevronRight className="w-3 h-3 text-gray-500" />
          <span className="text-white">{field.name}</span>
        </div>

        {/* Actions on image */}
        <div className="absolute top-6 right-4 md:right-8 flex gap-3">
          <button
            onClick={() => setSavedHeart(!savedHeart)}
            className={`p-3 rounded-full backdrop-blur-md transition-all border ${savedHeart ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-black/40 text-white hover:bg-black/60 border-white/10 hover:text-yellow-400"}`}
          >
            <Heart className={`w-5 h-5 ${savedHeart ? "fill-red-500" : ""}`} />
          </button>
          <button className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 hover:text-yellow-400 transition-all border border-white/10">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                {field.sportLabel || field.type}
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-xl mb-3 tracking-tight">
                {field.name}
              </h1>
              <p className="text-gray-400 text-sm md:text-base flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-yellow-500" /> {field.address}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 backdrop-blur-md px-4 py-3 rounded-2xl w-fit">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-white font-extrabold text-xl">{averageRating.toFixed(1)}</span>
              <span className="text-gray-400 text-xs font-medium ml-1">/ 5 ({reviewCount} đánh giá)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Info card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-slate-100">
                {[
                  { icon: <Clock className="w-6 h-6 text-yellow-500" />, label: "Giờ mở cửa", value: `${field.openTime} – ${field.closeTime}` },
                  { icon: <Phone className="w-6 h-6 text-yellow-500" />, label: "Hotline", value: field.phone, link: `tel:${field.phone}` },
                  { icon: <LayoutGrid className="w-6 h-6 text-yellow-500" />, label: "Số sân", value: `${courts.length} sân` },
                  { icon: <CheckCircle2 className="w-6 h-6 text-green-500" />, label: "Trạng thái", value: "Đang mở" },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-center mb-3">{stat.icon}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">{stat.label}</div>
                    {stat.link ? (
                      <a href={stat.link} className="text-sm font-extrabold text-amber-600 hover:text-amber-500 transition-colors">{stat.value}</a>
                    ) : (
                      <div className="text-sm font-extrabold text-slate-900">{stat.value}</div>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="font-extrabold text-slate-950 mb-4 text-xl">Giới thiệu cơ sở</h3>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed">{field.description}</p>
            </div>

            {/* Gallery */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm" aria-labelledby="gallery-title">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 id="gallery-title" className="font-extrabold text-slate-950 flex items-center gap-3 text-xl">
                  <Camera className="w-6 h-6 text-amber-500" />
                  Hình ảnh tại sân
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">{gallery.length} ảnh</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedGalleryImage(image)}
                    className={`relative overflow-hidden rounded-2xl group bg-slate-100 focus:outline-none focus:ring-4 focus:ring-amber-200 ${index === 0 ? "col-span-2 md:col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
                    aria-label={`Xem ảnh ${index + 1} của ${field.name}`}
                  >
                    <img src={image} alt={`Không gian ${field.name} - ảnh ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/25 transition-colors" />
                    {index === 0 && <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 bg-slate-950/75 text-white text-xs font-bold px-3 py-2 rounded-xl"><Camera className="w-4 h-4" /> Xem ảnh</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* Courts list */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="font-extrabold text-slate-950 mb-6 flex items-center gap-3 text-xl">
                <LayoutGrid className="w-6 h-6 text-amber-500" />
                Danh sách sân ({courts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courts.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${
                      c.status === "maintenance"
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-slate-200 bg-slate-50 hover:border-amber-300 transition-colors"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-base mb-0.5">{c.name}</div>
                      {c.status === "maintenance" && (
                        <span className="text-xs text-red-500 font-bold tracking-wide">🔧 Đang bảo trì</span>
                      )}
                    </div>
                    <div className="text-right">
                    <div className="text-amber-600 font-extrabold text-base">{formatCurrency(c.price)}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">/ giờ</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-950 flex items-center gap-3 text-xl">
                  <Clock className="w-6 h-6 text-amber-500" />
                  Lịch trống
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-medium text-slate-800"
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-8 mb-8 text-xs font-bold text-slate-500 tracking-wider uppercase">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-100 border-2 border-amber-400 rounded flex items-center justify-center" />
                  Có thể đặt
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-100 border-2 border-slate-300 rounded" />
                  Đã đặt
                </div>
              </div>

              {activeCourts.map((c) => (
                <div key={c.id} className="mb-8 last:mb-0 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-5">
                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      {c.name}
                    </div>
                    <div className="font-bold text-amber-700 text-sm bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                      {formatCurrency(c.price)} / h
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {TIME_SLOTS.map((t) => {
                      const booked = isBooked(c.id, t);
                      const preferred = preferredTime === t && !booked;
                      return (
                         <button
                           key={t}
                           type="button"
                           disabled={booked}
                           onClick={() =>
                             navigate(`/booking?fieldId=${field.id}&courtId=${c.id}&date=${selectedDate}&time=${t}`)
                           }
                           aria-label={`${booked ? "Đã đặt" : "Đặt"} ${c.name} lúc ${t}`}
                           className={`slot-btn rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
                             booked
                               ? "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
                               : preferred
                               ? "bg-amber-400 text-slate-950 border border-amber-400 ring-4 ring-amber-100"
                               : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400"
                           }`}
                         >
                           {t}
                         </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={() => navigate(`/booking?fieldId=${field.id}`)}
                className="btn-primary w-full mt-6 py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-base"
              >
                <CalendarDays className="w-5 h-5" /> Đặt sân ngay
              </button>
            </div>

            {/* Reviews */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm" aria-labelledby="reviews-title">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
                <h3 id="reviews-title" className="font-extrabold text-slate-950 flex items-center gap-3 text-xl">
                  <MessageCircle className="w-6 h-6 text-amber-500" />
                  Đánh giá từ người chơi
                </h3>
                <span className="text-xs text-slate-500 font-medium">Dữ liệu minh hoạ cho bản demo</span>
              </div>
              <div className="grid md:grid-cols-[180px_1fr] gap-7 pb-8 mb-8 border-b border-slate-100">
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 text-center">
                  <div className="text-4xl font-extrabold text-slate-950">{averageRating.toFixed(1)}</div>
                  <div className="flex justify-center gap-0.5 my-2">
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} className="w-4 h-4 text-amber-500 fill-amber-500" />)}
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{reviewCount} lượt đánh giá</p>
                </div>
                <div className="space-y-2.5">
                  {ratingBreakdown.map(({ rating, percent }) => (
                    <div key={rating} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <span className="w-8 flex items-center gap-1">{rating} <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /></span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} /></div>
                      <span className="w-8 text-right text-slate-400">{percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-5">
                {reviews.map((review) => (
                  <article key={review.id} className="flex gap-3 sm:gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center">{review.initial}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{review.author}</h4>
                        <span className="text-xs text-slate-400">{review.date}</span>
                      </div>
                      <div className="flex gap-0.5 my-1.5" aria-label={`${review.rating} trên 5 sao`}>
                        {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`w-3.5 h-3.5 ${index < review.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />)}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Map */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="font-extrabold text-slate-950 mb-6 flex items-center gap-3 text-xl">
                <Map className="w-6 h-6 text-amber-500" />
                Vị trí sân
              </h3>
              <p className="text-sm text-slate-600 mb-6 flex items-center gap-3 bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl">
                <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                {field.address}
              </p>
              <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden border border-slate-200 mb-6 opacity-90 hover:opacity-100 transition-opacity">
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
              <div className="flex flex-wrap gap-4">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(field.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm transition-all"
                >
                  <MapPin className="w-4 h-4" /> Chỉ đường
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-slate-300 bg-white text-slate-700 hover:border-amber-400 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm transition-all"
                >
                  <Map className="w-4 h-4" /> Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* Right – Sticky Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Price header */}
                <div className="p-8 bg-gradient-to-br from-amber-100 via-white to-white border-b border-slate-100">
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Giá thuê sân từ</div>
                  <div className="text-4xl font-extrabold text-amber-600 mb-3">
                    {formatCurrency(field.priceFrom || field.pricePerHour || 0)}
                    <span className="text-slate-400 text-sm font-bold tracking-wider uppercase ml-1">/ giờ</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white w-fit px-3 py-1.5 rounded-lg border border-amber-100">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-slate-900 font-bold text-sm">{field.rating?.toFixed(1) || "4.8"}</span>
                    <span className="text-slate-500 text-xs font-medium">· {courts.length} sân</span>
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <button
                    onClick={() => navigate(`/booking?fieldId=${field.id}`)}
                    className="btn-primary w-full py-4 rounded-xl font-extrabold flex justify-center items-center gap-2 text-base"
                  >
                    <CalendarDays className="w-5 h-5" /> Đặt sân ngay
                  </button>
                  <a
                    href={`tel:${field.phone}`}
                    className="border border-slate-300 bg-white text-slate-700 hover:border-amber-400 w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-sm"
                  >
                    <Phone className="w-4 h-4" /> Liên hệ: {field.phone}
                  </a>

                  {/* Trust badges */}
                  <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                    {[
                      { icon: "🛡️", text: "Đặt cọc an toàn & bảo mật" },
                      { icon: "⏱️", text: "Hủy miễn phí trước 2 giờ" },
                      { icon: "✅", text: "Xác nhận tức thì qua email" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="text-lg opacity-80">{item.icon}</span>
                        <span className="font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Courts summary */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h4 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <LayoutGrid className="w-4 h-4 text-amber-500" /> Sân đang hoạt động
                </h4>
                <div className="space-y-2">
                  {activeCourts.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-700 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" /> {c.name}
                      </span>
                      <span className="text-amber-600 font-extrabold">{formatCurrency(c.price)}</span>
                    </div>
                  ))}
                  {activeCourts.length > 4 && (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center pt-3">
                      + {activeCourts.length - 4} sân khác
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedGalleryImage && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Xem ảnh sân">
          <button type="button" onClick={() => setSelectedGalleryImage(null)} className="absolute top-5 right-5 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Đóng ảnh">
            <X className="w-5 h-5" />
          </button>
          <img src={selectedGalleryImage} alt={`Ảnh ${field.name}`} className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
