import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, CalendarCheck2, CalendarDays, ChevronRight,
  Gift, Loader2, Map, MapPin, Newspaper, Search, ShieldCheck,
  Star, Trophy, Users, Zap,
} from "lucide-react";
import banner2 from "../assets/banner2.jpg";
import { fetchFields, Field, formatCurrency } from "../lib/api";
import { blogs } from "./blogData";
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
  navy: "bg-slate-950 text-yellow-400",
  amber: "bg-amber-400 text-slate-950",
  emerald: "bg-emerald-600 text-white",
  blue: "bg-sky-600 text-white",
};

export default function Home() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#f7f8f6]">
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div className="animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Nền tảng đặt sân bóng rổ trực tuyến
            </div>
            <h1 className="max-w-2xl text-5xl font-extrabold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Sân đẹp đã có.
              <span className="mt-2 block text-amber-500">Kèo hay chờ bạn.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Tìm sân, kiểm tra lịch trống và giữ chỗ trong một luồng đơn giản. Không cần gọi điện nhiều lần, không lo bỏ lỡ giờ đẹp.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-emerald-600" /> Giá rõ ràng</span>
              <span className="inline-flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Giữ chỗ nhanh</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sky-600" /> Thanh toán an toàn</span>
            </div>
          </div>

          <div className="relative animate-fade-in-up delay-100">
            <div className="relative h-[420px] overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl shadow-slate-900/20 sm:h-[500px]">
              <img src={banner2} alt="Sân bóng rổ GoldenState" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">Trải nghiệm liền mạch</p>
                <p className="mt-2 max-w-md text-2xl font-bold leading-tight sm:text-3xl">Chọn giờ chơi phù hợp trước khi bạn rời nhà.</p>
              </div>
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:-left-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarCheck2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Đặt sân trực tuyến</p>
                <p className="font-extrabold text-slate-900">Chủ động 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-1 px-4 pb-8 lg:-mt-10">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Tìm kiếm nhanh</p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Bạn muốn chơi ở đâu?</h2>
            </div>
            <Link to="/map" className="hidden items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-amber-600 sm:flex">
              <Map className="h-4 w-4" /> Xem bản đồ
            </Link>
          </div>
          <form onSubmit={handleSearch} className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-10">
            <label className="lg:col-span-3">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500"><MapPin className="h-3.5 w-3.5" /> Tỉnh / thành phố</span>
              <select
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setDistrict("");
                }}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
              >
                {Object.keys(locationOptions).map((location) => <option key={location}>{location}</option>)}
              </select>
            </label>
            <label className="lg:col-span-2">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500"><MapPin className="h-3.5 w-3.5" /> Quận / huyện</span>
              <select value={district} onChange={(event) => setDistrict(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100">
                {locationOptions[city].map((area, index) => <option key={area} value={index === 0 ? "" : area}>{area}</option>)}
              </select>
            </label>
            <label className="lg:col-span-2">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Ngày chơi</span>
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
            </label>
            <button type="submit" className="btn-primary flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold lg:col-span-2">
              <Search className="h-4 w-4" /> Tìm sân
            </button>
          </form>
        </div>
      </section>

      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Khám phá GoldenState</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Mọi hoạt động bóng rổ trong một nơi</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map(({ to, icon: Icon, title, description }) => (
              <Link key={title} to={to} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-400 group-hover:text-slate-950">
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-extrabold text-slate-900">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Ưu đãi</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Đặc quyền dành cho người chơi</h2>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Link to="/fields" className="group relative min-h-64 overflow-hidden rounded-[2rem] bg-amber-400 p-7 text-slate-950 sm:p-9">
              <div className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full border-[42px] border-white/30 transition-transform duration-500 group-hover:scale-110" />
              <Gift className="h-8 w-8" />
              <p className="mt-8 text-sm font-bold uppercase tracking-[0.16em]">Đặt sân lần đầu</p>
              <h3 className="mt-2 max-w-sm text-4xl font-extrabold leading-none">Nhập mã GOLDEN20 giảm ngay 20%</h3>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold">Chọn sân ngay <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
            <Link to="/register" className="group relative min-h-64 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white sm:p-9">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-2xl" />
              <Users className="h-8 w-8 text-emerald-400" />
              <p className="mt-8 text-sm font-bold uppercase tracking-[0.16em] text-emerald-400">Thành viên GoldenState</p>
              <h3 className="mt-2 max-w-md text-4xl font-extrabold leading-none">Tích điểm mỗi trận, nhận thêm giờ chơi</h3>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold">Tham gia miễn phí <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Gợi ý cho bạn</p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">Sân nổi bật</h2>
              <p className="mt-3 text-slate-500">Chọn sân phù hợp và xem lịch trống theo thời gian bạn muốn chơi.</p>
            </div>
            <Link to="/fields" className="inline-flex items-center gap-2 font-bold text-slate-700 transition-colors hover:text-amber-600">
              Xem tất cả sân <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center" role="status">
              <Loader2 className="h-9 w-9 animate-spin text-amber-500" />
              <span className="sr-only">Đang tải danh sách sân</span>
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <Trophy className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-xl font-extrabold text-slate-900">Chưa tải được danh sách sân</h3>
              <p className="mt-2 text-sm text-slate-500">Bạn vẫn có thể mở trang tìm sân để thử lại.</p>
              <Link to="/fields" className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold">Mở danh sách sân</Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <Link key={field.id} to={`/field/${field.id}`} className="field-card group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    <img src={field.imageUrl || field.image} alt={field.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-slate-800 shadow-sm backdrop-blur">
                      {field.type || field.sportLabel || "Sân bóng rổ"}
                    </div>
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(field.rating ?? 4.8).toFixed(1)}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="line-clamp-1 text-xl font-extrabold text-slate-950 transition-colors group-hover:text-amber-600">{field.name}</h3>
                    <p className="mt-2 flex items-start gap-2 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="line-clamp-1">{field.location || field.address}</span></p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Giá từ</p>
                        <p className="mt-1 text-lg font-extrabold text-amber-600">{formatCurrency(field.pricePerHour ?? field.priceFrom)}<span className="text-xs font-semibold text-slate-400"> / giờ</span></p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-amber-400 group-hover:text-slate-950"><ChevronRight className="h-5 w-5" /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="clubs" className="scroll-mt-32 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Cộng đồng bóng rổ</p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">Câu lạc bộ gần bạn</h2>
              <p className="mt-3 text-slate-500">Tìm đồng đội, tham gia buổi tập và không còn phải chơi một mình.</p>
            </div>
            <Link to="/clubs" className="inline-flex items-center gap-2 font-bold text-slate-700 hover:text-amber-600">Xem tất cả CLB <ChevronRight className="h-5 w-5" /></Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {clubs.map((club) => (
              <article key={club.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-black shadow-sm ${clubTone[club.tone]}`}>{club.initials}</div>
                <p className="mt-6 text-xs font-bold uppercase tracking-wider text-amber-600">{club.sport}</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">{club.name}</h3>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {club.area}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><Users className="h-4 w-4" /> {club.members} thành viên</span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {club.rating}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="tournaments" className="scroll-mt-32 bg-slate-950 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">Thi đấu & kết nối</p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight">Giải đấu sắp diễn ra</h2>
              <p className="mt-3 text-slate-400">Đăng ký đội, theo dõi lịch và chinh phục bảng xếp hạng.</p>
            </div>
            <Link to="/tournaments" className="inline-flex items-center gap-2 font-bold text-slate-200 hover:text-yellow-400">Xem tất cả giải <ChevronRight className="h-5 w-5" /></Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <article key={tournament.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
                <div className="relative h-52 overflow-hidden">
                  <img src={tournament.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-white">{tournament.status}</span>
                  <span className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-[0.14em] text-yellow-300">{tournament.sport}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-extrabold leading-tight">{tournament.name}</h3>
                  <div className="mt-5 space-y-2 text-sm text-slate-400">
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-yellow-400" /> {tournament.date}</p>
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-yellow-400" /> {tournament.location}</p>
                    <p className="flex items-center gap-2"><Users className="h-4 w-4 text-yellow-400" /> {tournament.teams} đội tham dự</p>
                  </div>
                  <Link to="/contact" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-extrabold text-slate-950 transition-colors hover:bg-yellow-400">
                    Xem thông tin giải <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="rankings" className="scroll-mt-32 bg-white px-4 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Phong độ mùa giải</p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">Bảng xếp hạng CLB</h2>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[32px_minmax(0,1fr)_44px_48px] gap-2 bg-slate-950 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid-cols-[44px_minmax(0,1fr)_48px_48px_48px_64px] sm:px-4">
                <span>#</span><span className="text-left">Câu lạc bộ</span><span>Trận</span><span className="hidden sm:block">Thắng</span><span className="hidden sm:block">Thua</span><span>Điểm</span>
              </div>
              {rankings.map((team) => (
                <div key={team.rank} className="grid grid-cols-[32px_minmax(0,1fr)_44px_48px] items-center gap-2 border-t border-slate-100 px-3 py-4 text-center text-sm first:border-t-0 sm:grid-cols-[44px_minmax(0,1fr)_48px_48px_48px_64px] sm:px-4">
                  <span className={`font-black ${team.rank <= 3 ? "text-amber-600" : "text-slate-400"}`}>{team.rank}</span>
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-black text-slate-700">{team.initials}</span>
                    <span className="truncate font-extrabold text-slate-900">{team.name}</span>
                  </span>
                  <span className="text-slate-500">{team.matches}</span>
                  <span className="hidden font-semibold text-emerald-600 sm:block">{team.won}</span>
                  <span className="hidden text-slate-500 sm:block">{team.lost}</span>
                  <span className="font-black text-slate-950">{team.points}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-7 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Góc người chơi</p>
                <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">Tin mới nhất</h2>
              </div>
              <Link to="/blog" className="text-sm font-bold text-slate-600 hover:text-amber-600">Xem tất cả</Link>
            </div>
            <div className="space-y-4">
              {blogs.slice(0, 3).map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="group grid grid-cols-[112px_1fr] gap-4 rounded-2xl border border-slate-200 p-3 transition hover:border-amber-300 hover:shadow-md">
                  <img src={post.image} alt="" loading="lazy" className="h-24 w-28 rounded-xl object-cover" />
                  <span className="min-w-0 py-1">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600"><Newspaper className="h-3.5 w-3.5" /> {post.category}</span>
                    <span className="mt-2 line-clamp-2 block font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-amber-600">{post.title}</span>
                    <span className="mt-2 block text-xs text-slate-400">{post.date}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white sm:px-12 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14 lg:px-16 lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">Đặt sân thật đơn giản</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Ba bước để sẵn sàng ra sân.</h2>
            <p className="mt-5 max-w-md leading-7 text-slate-400">Từ lúc chọn sân đến lúc nhận xác nhận đều được thực hiện ngay trên GoldenState.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-0">
            {[
              { number: "01", title: "Tìm sân", text: "Chọn khu vực, ngày và khung giờ." },
              { number: "02", title: "Chọn lịch", text: "Kiểm tra sân trống và giá phù hợp." },
              { number: "03", title: "Xác nhận", text: "Thanh toán và nhận vé đặt sân." },
            ].map((step) => (
              <div key={step.number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <span className="text-sm font-black text-yellow-400">{step.number}</span>
                <h3 className="mt-8 text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
