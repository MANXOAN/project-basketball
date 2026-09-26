import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, CalendarCheck2, CalendarDays, ChevronRight,
  Gift, Map, MapPin, Newspaper, Search, ShieldCheck,
  Star, Trophy, Users, Zap,
} from "lucide-react";
import banner2 from "../assets/banner2.jpg";
import { fetchFields, fetchVbaNews, Field, formatCurrency, NewsItem } from "../lib/api";
import {
  clubs, locationOptions, rankings, tournaments,
} from "../data/marketplaceMock";

const quickActions = [
  { to: "/fields", icon: Search, title: "Tìm sân phù hợp", description: "Lọc theo khu vực và thời gian" },
  { to: "/map", icon: Map, title: "Khám phá quanh bạn", description: "Xem vị trí sân trên bản đồ" },
  { to: "/my-bookings", icon: CalendarCheck2, title: "Quản lý lịch chơi", description: "Theo dõi mọi đơn đặt sân" },
  { to: "/about", icon: ShieldCheck, title: "Đặt sân an tâm", description: "Thông tin và giá được minh bạch" },
];

const clubTone = {
  navy: "bg-brand-600 text-white",
  amber: "bg-brand-100 text-brand-800",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
};

const steps = [
  { number: "01", icon: Search, title: "Tìm sân", text: "Chọn khu vực, ngày và khung giờ." },
  { number: "02", icon: CalendarDays, title: "Chọn lịch", text: "Kiểm tra sân trống và giá phù hợp." },
  { number: "03", icon: BadgeCheck, title: "Xác nhận", text: "Thanh toán và nhận vé đặt sân." },
];

const inputClass = "h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100";

/** Thứ tự cho hiệu ứng xuất hiện lần lượt. */
const revealAt = (index: number) => ({ "--reveal-index": index } as CSSProperties);
const enterAt = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

function SectionHeading({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div data-reveal className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        <p className="eyebrow"><span className="h-1.5 w-6 rounded-full bg-brand-500" />{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 leading-7 text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function SeeAll({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-xl px-1 text-sm font-bold text-brand-700 transition-colors hover:text-brand-800 sm:self-auto">
      {children} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function Home() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [city, setCity] = useState("Hồ Chí Minh");
  const [district, setDistrict] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchFields()
      .then((data) => setFields(data.slice(0, 6)))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchVbaNews(3)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.hash]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    params.set("q", district ? `${district}, ${city}` : city);
    if (date) params.set("date", date);
    navigate(`/fields?${params.toString()}`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-stone-900">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-stone-200/70">
        <div className="brand-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]" aria-hidden />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-300/25 blur-3xl" aria-hidden />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <span className="chip animate-fade-in-up bg-white shadow-soft" style={enterAt(0)}>
              <span className="h-2 w-2 rounded-full bg-brand-500 ring-4 ring-brand-100" />
              Nền tảng đặt sân bóng rổ trực tuyến
            </span>
            <h1 className="mt-6 max-w-2xl animate-fade-in-up text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl" style={enterAt(0.08)}>
              Sân đẹp đã có.
              <span className="mt-1 block bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 bg-clip-text pb-1 text-transparent">Kèo hay chờ bạn.</span>
            </h1>
            <p className="mt-6 max-w-xl animate-fade-in-up text-base leading-7 text-stone-600 sm:text-lg sm:leading-8" style={enterAt(0.16)}>
              Tìm sân, kiểm tra lịch trống và giữ chỗ trong một luồng đơn giản. Không cần gọi điện nhiều lần, không lo bỏ lỡ giờ đẹp.
            </p>

            {/* Tìm kiếm nhanh */}
            <form
              onSubmit={handleSearch}
              aria-label="Tìm sân nhanh"
              className="mt-8 animate-fade-in-up rounded-3xl border border-stone-200 bg-white p-3 shadow-lift sm:p-4"
              style={enterAt(0.24)}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
                <label className="min-w-0">
                  <span className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold text-stone-600"><MapPin className="h-3.5 w-3.5 text-brand-600" /> Tỉnh / thành phố</span>
                  <select
                    value={city}
                    onChange={(event) => {
                      setCity(event.target.value);
                      setDistrict("");
                    }}
                    className={inputClass}
                  >
                    {Object.keys(locationOptions).map((location) => <option key={location}>{location}</option>)}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold text-stone-600"><MapPin className="h-3.5 w-3.5 text-brand-600" /> Quận / huyện</span>
                  <select value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClass}>
                    {locationOptions[city].map((area, index) => <option key={area} value={index === 0 ? "" : area}>{area}</option>)}
                  </select>
                </label>
                <label className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <span className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold text-stone-600"><CalendarDays className="h-3.5 w-3.5 text-brand-600" /> Ngày chơi</span>
                  <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} className={inputClass} />
                </label>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="submit" className="btn-primary flex h-12 w-full items-center sm:flex-1 justify-center gap-2 rounded-xl px-6 text-sm font-extrabold">
                  <Search className="h-4 w-4" /> Tìm sân trống
                </button>
                <Link to="/map" className="btn-outline flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold">
                  <Map className="h-4 w-4" /> Xem bản đồ
                </Link>
              </div>
            </form>

            <ul className="mt-7 flex animate-fade-in-up flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-stone-600" style={enterAt(0.32)}>
              <li className="inline-flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-brand-600" /> Giá rõ ràng</li>
              <li className="inline-flex items-center gap-2"><Zap className="h-5 w-5 text-brand-600" /> Giữ chỗ nhanh</li>
              <li className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-600" /> Thanh toán an toàn</li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl animate-scale-in lg:max-w-none" style={enterAt(0.2)}>
            <div className="absolute -inset-3 rotate-2 rounded-[2.25rem] bg-gradient-to-br from-brand-200 to-brand-400/60 sm:-inset-4" aria-hidden />
            <div className="relative h-[360px] overflow-hidden rounded-[2rem] bg-stone-200 shadow-lift sm:h-[480px] lg:h-[540px]">
              <img src={banner2} alt="Cầu thủ bật nhảy úp rổ trong nhà thi đấu" className="h-full w-full object-cover object-[92%_center]" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-stone-950/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 pb-14 text-white sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-200">Trải nghiệm liền mạch</p>
                <p className="mt-2 max-w-md text-2xl font-bold leading-tight sm:text-3xl">Chọn giờ chơi phù hợp trước khi bạn rời nhà.</p>
              </div>
            </div>
            <div className="absolute -left-2 top-8 hidden items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 pr-5 shadow-lift sm:-left-8 sm:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CalendarCheck2 className="h-6 w-6" /></span>
              <span>
                <span className="block text-xs font-semibold text-stone-500">Đặt sân trực tuyến</span>
                <span className="block font-extrabold text-stone-900">Chủ động 24/7</span>
              </span>
            </div>
            <div className="absolute -right-2 -bottom-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 pr-5 shadow-lift sm:-right-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white"><Zap className="h-6 w-6" /></span>
              <span>
                <span className="block text-xs font-semibold text-stone-500">Giữ chỗ tức thì</span>
                <span className="block font-extrabold text-stone-900">Không cần gọi điện</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Lối tắt ─── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Khám phá GoldenState" title="Mọi hoạt động bóng rổ trong một nơi" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map(({ to, icon: Icon, title, description }, index) => (
              <div key={title} data-reveal style={revealAt(index)}>
                <Link to={to} className="hover-lift group relative flex h-full items-center gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-soft hover:border-brand-200 lg:flex-col lg:items-start lg:p-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-stone-900">{title}</span>
                    <span className="mt-1 block text-sm leading-5 text-stone-500">{description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 lg:absolute lg:right-6 lg:top-6" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ưu đãi ─── */}
      <section className="px-4 pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Ưu đãi" title="Đặc quyền dành cho người chơi" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div data-reveal>
              <Link to="/fields" className="hover-lift group relative flex h-full min-h-64 flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-7 text-white shadow-brand sm:p-9">
                <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full border-[40px] border-white/10 transition-transform duration-700 group-hover:scale-110" aria-hidden />
                <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-brand-400/40 blur-2xl" aria-hidden />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Gift className="h-6 w-6" /></span>
                <p className="relative mt-7 text-sm font-bold uppercase tracking-[0.14em] text-brand-100">Đặt sân lần đầu</p>
                <h3 className="relative mt-2 max-w-sm text-3xl font-extrabold leading-tight sm:text-4xl">Nhập mã <span className="rounded-lg bg-white px-2 text-brand-700">GOLDEN20</span> giảm ngay 20%</h3>
                <span className="relative mt-auto inline-flex items-center gap-2 pt-7 text-sm font-extrabold">Chọn sân ngay <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            </div>
            <div data-reveal style={revealAt(1)}>
              <Link to="/register" className="hover-lift group relative flex h-full min-h-64 flex-col overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 p-7 text-stone-950 sm:p-9">
                <div className="brand-grid absolute inset-y-0 right-0 w-1/2 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft"><Users className="h-6 w-6" /></span>
                <p className="relative mt-7 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Thành viên GoldenState</p>
                <h3 className="relative mt-2 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">Tích điểm mỗi trận, nhận thêm giờ chơi</h3>
                <span className="relative mt-auto inline-flex items-center gap-2 pt-7 text-sm font-extrabold text-brand-700">Tham gia miễn phí <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Sân nổi bật ─── */}
      <section className="border-y border-stone-200/70 bg-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Gợi ý cho bạn"
            title="Sân nổi bật"
            description="Chọn sân phù hợp và xem lịch trống theo thời gian bạn muốn chơi."
            action={<SeeAll to="/fields">Xem tất cả sân</SeeAll>}
          />

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
              <span className="sr-only">Đang tải danh sách sân</span>
              {[0, 1, 2].map((item) => (
                <div key={item} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
                  <div className="skeleton h-56 rounded-none" />
                  <div className="space-y-3 p-6">
                    <div className="skeleton h-6 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton mt-6 h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft"><Trophy className="h-7 w-7" /></span>
              <h3 className="mt-5 text-xl font-extrabold text-stone-900">Chưa tải được danh sách sân</h3>
              <p className="mt-2 text-sm text-stone-500">Bạn vẫn có thể mở trang tìm sân để thử lại.</p>
              <Link to="/fields" className="btn-primary mt-6 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-bold">Mở danh sách sân</Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field, index) => (
                <div key={field.id} data-reveal style={revealAt(index % 3)}>
                  <Link to={`/field/${field.id}`} className="field-card group flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft hover:border-brand-200">
                    <div className="zoom-media relative h-56 bg-stone-100">
                      <img src={field.imageUrl || field.image} alt={field.name} loading="lazy" className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-stone-950/25 to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-stone-800 shadow-sm backdrop-blur">
                        {field.type || field.sportLabel || "Sân bóng rổ"}
                      </span>
                      <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-extrabold text-stone-900 shadow-sm backdrop-blur">
                        <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" /> {Number(field.rating ?? 4.8) > 0 ? Number(field.rating ?? 4.8).toFixed(1) : "Mới"}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="line-clamp-1 text-xl font-extrabold text-stone-950 transition-colors group-hover:text-brand-700">{field.name}</h3>
                      <p className="mt-2 flex items-start gap-2 text-sm text-stone-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span className="line-clamp-1">{field.location || field.address}</span></p>
                      <div className="mt-5 flex flex-1 items-end"><div className="flex w-full items-center justify-between border-t border-stone-100 pt-5">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Giá từ</p>
                          <p className="mt-0.5 text-lg font-extrabold text-brand-700">{formatCurrency(field.pricePerHour ?? field.priceFrom)}<span className="text-xs font-semibold text-stone-500"> / giờ</span></p>
                        </div>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white" aria-hidden><ChevronRight className="h-5 w-5" /></span>
                      </div></div>
                    </div>
                  </Link>
                </div>
              ))}
              {fields.length < 6 && (
                <div data-reveal style={revealAt(fields.length % 3)}>
                  <Link to="/fields" className="hover-lift group flex h-full min-h-72 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/60 p-8 text-center hover:border-brand-400">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white"><Search className="h-6 w-6" /></span>
                    <span className="mt-5 text-lg font-extrabold text-stone-950">Khám phá thêm sân</span>
                    <span className="mt-1.5 max-w-xs text-sm leading-6 text-stone-500">Lọc theo khu vực, khoảng cách và tiện ích để tìm sân hợp ý bạn.</span>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-700">Xem tất cả sân <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Câu lạc bộ ─── */}
      <section id="clubs" className="scroll-mt-32 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Cộng đồng bóng rổ"
            title="Câu lạc bộ gần bạn"
            description="Tìm đồng đội, tham gia buổi tập và không còn phải chơi một mình."
            action={<SeeAll to="/clubs">Xem tất cả CLB</SeeAll>}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {clubs.map((club, index) => (
              <div key={club.id} data-reveal style={revealAt(index)}>
                <article className="hover-lift flex h-full flex-col rounded-3xl border border-stone-200 bg-white p-6 shadow-soft hover:border-brand-200">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black ${clubTone[club.tone]}`}>{club.initials}</div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-stone-800"><Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" /> {club.rating}</span>
                  </div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-700">{club.sport}</p>
                  <h3 className="mt-1 text-xl font-extrabold text-stone-950">{club.name}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500"><MapPin className="h-4 w-4 text-stone-400" /> {club.area}</p>
                  <p className="mt-5 flex items-center gap-1.5 border-t border-stone-100 pt-4 text-sm font-semibold text-stone-600"><Users className="h-4 w-4 text-brand-600" /> {club.members} thành viên</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Giải đấu ─── */}
      <section id="tournaments" className="scroll-mt-32 border-y border-brand-100 bg-brand-50/60 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Thi đấu & kết nối"
            title="Giải đấu sắp diễn ra"
            description="Đăng ký đội, theo dõi lịch và chinh phục bảng xếp hạng."
            action={<SeeAll to="/tournaments">Xem tất cả giải</SeeAll>}
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament, index) => (
              <div key={tournament.id} data-reveal style={revealAt(index)}>
                <article className="hover-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
                  <div className="zoom-media relative h-52">
                    <img src={tournament.image} alt={tournament.name} loading="lazy" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950/70 to-transparent" />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{tournament.status}
                    </span>
                    <span className="absolute bottom-4 left-4 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">{tournament.sport}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-extrabold leading-tight text-stone-950 sm:text-2xl">{tournament.name}</h3>
                    <div className="mt-4 space-y-2.5 text-sm text-stone-600">
                      <p className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-brand-600" /> {tournament.date}</p>
                      <p className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-brand-600" /> {tournament.location}</p>
                      <p className="flex items-center gap-2.5"><Users className="h-4 w-4 text-brand-600" /> {tournament.teams} đội tham dự</p>
                    </div>
                    <Link to="/contact" className="btn-outline mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold">
                      Xem thông tin giải <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Xếp hạng + tin tức ─── */}
      <section id="rankings" className="scroll-mt-32 bg-white px-4 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
          <div className="min-w-0">
            <SectionHeading eyebrow="Phong độ mùa giải" title="Bảng xếp hạng CLB" action={<SeeAll to="/rankings">Chi tiết</SeeAll>} />
            <div data-reveal className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
              <div className="grid grid-cols-[32px_minmax(0,1fr)_44px_48px] gap-2 border-b border-stone-200 bg-stone-50 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500 sm:grid-cols-[44px_minmax(0,1fr)_48px_48px_48px_64px] sm:px-4">
                <span>#</span><span className="text-left">Câu lạc bộ</span><span>Trận</span><span className="hidden sm:block">Thắng</span><span className="hidden sm:block">Thua</span><span>Điểm</span>
              </div>
              {rankings.map((team) => (
                <div key={team.rank} className="grid grid-cols-[32px_minmax(0,1fr)_44px_48px] items-center gap-2 border-t border-stone-100 px-3 py-3.5 text-center text-sm transition-colors first:border-t-0 hover:bg-brand-50/50 sm:grid-cols-[44px_minmax(0,1fr)_48px_48px_48px_64px] sm:px-4">
                  <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${team.rank === 1 ? "bg-brand-600 text-white" : team.rank <= 3 ? "bg-brand-100 text-brand-800" : "text-stone-500"}`}>{team.rank}</span>
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[11px] font-black text-stone-700">{team.initials}</span>
                    <span className="truncate font-extrabold text-stone-900">{team.name}</span>
                  </span>
                  <span className="text-stone-500">{team.matches}</span>
                  <span className="hidden font-semibold text-emerald-700 sm:block">{team.won}</span>
                  <span className="hidden text-stone-500 sm:block">{team.lost}</span>
                  <span className="font-black text-stone-950">{team.points}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <SectionHeading eyebrow="Góc người chơi" title="Tin mới nhất" action={<SeeAll to="/blog">Xem tất cả</SeeAll>} />
            <div className="space-y-4">
              {newsLoading ? [1, 2, 3].map((item) => (
                <div key={item} className="grid grid-cols-[112px_1fr] gap-4 rounded-2xl border border-stone-200 p-3">
                  <div className="skeleton h-24 w-28" />
                  <div className="space-y-2 py-1"><div className="skeleton h-3 w-20" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /></div>
                </div>
              )) : news.length ? news.map((post, index) => (
                <div key={post.id} data-reveal style={revealAt(index)}>
                  <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="hover-lift group grid grid-cols-[96px_1fr] gap-4 rounded-2xl border border-stone-200 bg-white p-3 hover:border-brand-200 sm:grid-cols-[112px_1fr]">
                    <span className="zoom-media block h-24 w-24 rounded-xl bg-stone-100 sm:w-28">
                      <img src={post.image || banner2} alt={post.title} loading="lazy" onError={(event) => { event.currentTarget.src = banner2; }} className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 py-1">
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-700"><Newspaper className="h-3.5 w-3.5" /> {post.category}</span>
                      <span className="mt-2 line-clamp-2 block font-extrabold leading-snug text-stone-900 transition-colors group-hover:text-brand-700">{post.title}</span>
                      <span className="mt-2 block text-xs text-stone-500">{post.date}</span>
                    </span>
                  </a>
                </div>
              )) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-500">
                  <Newspaper className="h-5 w-5 shrink-0 text-stone-400" /> Chưa thể tải tin tức VBA lúc này.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ba bước ─── */}
      <section className="px-4 py-16 sm:py-24">
        <div data-reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-brand-100 bg-white px-6 py-12 shadow-soft sm:px-12 lg:px-16 lg:py-16">
          <div className="brand-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_bottom_right,black_10%,transparent_60%)]" aria-hidden />
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
          <div className="relative lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
            <div>
              <p className="eyebrow"><span className="h-1.5 w-6 rounded-full bg-brand-500" />Đặt sân thật đơn giản</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-stone-950 sm:text-5xl">Ba bước để sẵn sàng ra sân.</h2>
              <p className="mt-5 max-w-md leading-7 text-stone-600">Từ lúc chọn sân đến lúc nhận xác nhận đều được thực hiện ngay trên GoldenState.</p>
              <Link to="/fields" className="btn-primary mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-extrabold">
                Bắt đầu tìm sân <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-0">
              {steps.map(({ number, icon: Icon, title, text }, index) => (
                <li key={number} data-reveal style={revealAt(index + 1)} className="relative rounded-3xl border border-stone-200 bg-white p-5 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
                    <span className="text-3xl font-black tracking-tight text-brand-200">{number}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-extrabold text-stone-950">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-stone-500">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
