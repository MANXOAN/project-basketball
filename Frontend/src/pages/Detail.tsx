import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Heart, Share2, MapPin, Clock, Phone, LayoutGrid, CheckCircle2,
  CalendarDays, Map, Loader2, ChevronRight, Star,
} from "lucide-react";
import { api, Court, Field, formatCurrency, TIME_SLOTS, getBookingsByDate, Booking } from "../lib/api";
import toast from "react-hot-toast";

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [field, setField] = useState<Field | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [bookedByCourt, setBookedByCourt] = useState<Record<number, Booking[]>>({});
  const [savedHeart, setSavedHeart] = useState(false);

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
        toast.error("Không tìm thấy cơ sở");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!courts.length || !selectedDate) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getBookingsByDate(selectedDate);
        if (cancelled) return;
        const map: Record<number, Booking[]> = {};
        for (const c of courts) {
          map[c.id] = list.filter((b) => b.courtId === c.id && b.status !== "cancelled");
        }
        setBookedByCourt(map);
      } catch {
        if (!cancelled) setBookedByCourt({});
      }
    })();
    return () => { cancelled = true; };
  }, [courts, selectedDate]);

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
      <div className="flex flex-col items-center justify-center py-36 gap-3 bg-black min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
        <p className="text-gray-400 text-sm font-medium">Đang tải thông tin cơ sở...</p>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-black min-h-screen">
        <div className="text-6xl mb-4 opacity-70">🏟️</div>
        <p className="text-gray-500 mb-6 text-lg">Không tìm thấy cơ sở này</p>
        <Link to="/fields" className="btn-outline px-6 py-3 rounded-xl font-bold text-sm inline-block shadow-lg">
          ← Quay lại tìm sân
        </Link>
      </div>
    );
  }

  const activeCourts = courts.filter((c) => c.status === "active");

  return (
    <div className="bg-black text-gray-300 min-h-screen">
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
              <span className="text-white font-extrabold text-xl">{field.rating?.toFixed(1) || "4.8"}</span>
              <span className="text-gray-400 text-xs font-medium ml-1">/ 5 (240 đánh giá)</span>
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
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-white/10">
                {[
                  { icon: <Clock className="w-6 h-6 text-yellow-500" />, label: "Giờ mở cửa", value: `${field.openTime} – ${field.closeTime}` },
                  { icon: <Phone className="w-6 h-6 text-yellow-500" />, label: "Hotline", value: field.phone, link: `tel:${field.phone}` },
                  { icon: <LayoutGrid className="w-6 h-6 text-yellow-500" />, label: "Số sân", value: `${courts.length} sân` },
                  { icon: <CheckCircle2 className="w-6 h-6 text-green-500" />, label: "Trạng thái", value: "Đang mở" },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4 bg-black rounded-2xl border border-white/5">
                    <div className="flex justify-center mb-3">{stat.icon}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">{stat.label}</div>
                    {stat.link ? (
                      <a href={stat.link} className="text-sm font-extrabold text-yellow-400 hover:text-yellow-300 transition-colors">{stat.value}</a>
                    ) : (
                      <div className="text-sm font-extrabold text-white">{stat.value}</div>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="font-extrabold text-white mb-4 text-xl">Giới thiệu cơ sở</h3>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">{field.description}</p>
            </div>

            {/* Courts list */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="font-extrabold text-white mb-6 flex items-center gap-3 text-xl">
                <LayoutGrid className="w-6 h-6 text-yellow-500" />
                Danh sách sân ({courts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courts.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${
                      c.status === "maintenance"
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-white/5 bg-black hover:border-yellow-500/30 transition-colors"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-base mb-0.5">{c.name}</div>
                      {c.status === "maintenance" && (
                        <span className="text-xs text-red-500 font-bold tracking-wide">🔧 Đang bảo trì</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 font-extrabold text-base">{formatCurrency(c.price)}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">/ giờ</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
                <h3 className="font-extrabold text-white flex items-center gap-3 text-xl">
                  <Clock className="w-6 h-6 text-yellow-500" />
                  Lịch trống
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-black border border-white/10 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-medium text-white color-scheme-dark"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-8 mb-8 text-xs font-bold text-gray-400 tracking-wider uppercase">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500/20 border-2 border-yellow-500/50 rounded flex items-center justify-center" />
                  Có thể đặt
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-zinc-800 border-2 border-zinc-700 rounded" />
                  Đã đặt
                </div>
              </div>

              {activeCourts.map((c) => (
                <div key={c.id} className="mb-8 last:mb-0 bg-black p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-5">
                    <div className="font-extrabold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse-glow" />
                      {c.name}
                    </div>
                    <div className="font-bold text-yellow-400 text-sm bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                      {formatCurrency(c.price)} / h
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {TIME_SLOTS.map((t) => {
                      const booked = isBooked(c.id, t);
                      return (
                         <button
                           key={t}
                           type="button"
                           disabled={booked}
                           onClick={() =>
                             navigate(`/booking?fieldId=${field.id}&courtId=${c.id}&date=${selectedDate}&time=${t}`)
                           }
                           className={`slot-btn rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
                             booked
                               ? "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
                               : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-black hover:border-yellow-500"
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
                className="btn-primary w-full mt-6 text-black py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-base"
              >
                <CalendarDays className="w-5 h-5" /> Đặt sân ngay
              </button>
            </div>

            {/* Map */}
            <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6 md:p-8">
              <h3 className="font-extrabold text-white mb-6 flex items-center gap-3 text-xl">
                <Map className="w-6 h-6 text-yellow-500" />
                Vị trí sân
              </h3>
              <p className="text-sm text-gray-300 mb-6 flex items-center gap-3 bg-black border border-white/5 px-5 py-4 rounded-2xl">
                <MapPin className="w-5 h-5 text-yellow-500 shrink-0" />
                {field.address}
              </p>
              <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden border border-white/5 mb-6 opacity-90 hover:opacity-100 transition-opacity">
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
                  className="btn-outline inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm transition-all"
                >
                  <Map className="w-4 h-4" /> Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* Right – Sticky Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden shadow-2xl shadow-black/50">
                {/* Price header */}
                <div className="p-8 bg-gradient-to-br from-yellow-500/20 via-black to-black border-b border-white/5">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Giá thuê sân từ</div>
                  <div className="text-4xl font-extrabold text-yellow-400 mb-3">
                    {formatCurrency(field.priceFrom || field.pricePerHour || 0)}
                    <span className="text-gray-500 text-sm font-bold tracking-wider uppercase ml-1">/ giờ</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-white font-bold text-sm">{field.rating?.toFixed(1) || "4.8"}</span>
                    <span className="text-gray-400 text-xs font-medium">· {courts.length} sân</span>
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
                    className="btn-outline w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all text-sm"
                  >
                    <Phone className="w-4 h-4" /> Liên hệ: {field.phone}
                  </a>

                  {/* Trust badges */}
                  <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                    {[
                      { icon: "🛡️", text: "Đặt cọc an toàn & bảo mật" },
                      { icon: "⏱️", text: "Hủy miễn phí trước 2 giờ" },
                      { icon: "✅", text: "Xác nhận tức thì qua email" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="text-lg opacity-80">{item.icon}</span>
                        <span className="font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Courts summary */}
              <div className="bg-zinc-900 rounded-3xl border border-white/5 p-6">
                <h4 className="font-extrabold text-white text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <LayoutGrid className="w-4 h-4 text-yellow-500" /> Sân đang hoạt động
                </h4>
                <div className="space-y-2">
                  {activeCourts.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-sm p-3 bg-black rounded-xl border border-white/5">
                      <span className="text-gray-300 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" /> {c.name}
                      </span>
                      <span className="text-yellow-400 font-extrabold">{formatCurrency(c.price)}</span>
                    </div>
                  ))}
                  {activeCourts.length > 4 && (
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center pt-3">
                      + {activeCourts.length - 4} sân khác
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
