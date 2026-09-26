import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { List, MapPin, Navigation, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { fetchFields, Field, formatCurrency } from "../lib/api";
import { District, fetchDistricts, majorCities } from "../lib/administrative";
import toast from "react-hot-toast";

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [city, setCity] = useState(() => searchParams.get("city") || "all");
  const [district, setDistrict] = useState("all");
  const [districts, setDistricts] = useState<District[]>([]);

  useEffect(() => {
    fetchFields().then(setFields).catch(() => {
      toast.error("Không tải được danh sách sân");
      setFields([]);
    }).finally(() => setLoading(false));
  }, []);
  const filteredFields = useMemo(() => fields.filter((field) => {
    const keyword = query.trim().toLocaleLowerCase("vi-VN");
    return (!keyword || `${field.name} ${field.address}`.toLocaleLowerCase("vi-VN").includes(keyword))
      && (city === "all" || field.city === city)
      && (district === "all" || field.address.toLocaleLowerCase("vi-VN").includes(district.toLocaleLowerCase("vi-VN").replace(/^(quận|huyện|thị xã|thành phố)\s+/i, "")));
  }), [fields, query, city, district]);

  useEffect(() => {
    setDistrict("all");
    if (city === "all") { setDistricts([]); return; }
    const selectedCity = majorCities.find((item) => item.name === city);
    if (!selectedCity) return;
    let active = true;
    fetchDistricts(selectedCity.code).then((data) => { if (active) setDistricts(data); }).catch(() => { if (active) setDistricts([]); });
    return () => { active = false; };
  }, [city]);

  useEffect(() => {
    if (!filteredFields.length) return;
    if (!selectedId || !filteredFields.some((field) => field.id === selectedId)) setSelectedId(filteredFields[0].id);
  }, [filteredFields, selectedId]);

  const focusField = (field: Field) => {
    setSelectedId(field.id);
  };

  const mapQuery = [
    query.trim(),
    "sân bóng rổ",
    district === "all" ? "" : district,
    city === "all" ? "Việt Nam" : city,
  ].filter(Boolean).join(", ");
  const googleEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=13&output=embed`;

  const controlClass = "h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="min-h-screen bg-surface text-stone-900">
      <section className="relative overflow-hidden border-b border-stone-200/70 bg-white">
        <div className="brand-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black_15%,transparent_65%)]" aria-hidden />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-10 sm:py-12 md:flex-row md:items-end">
          <div className="animate-fade-in-up">
            <p className="eyebrow"><Sparkles className="h-4 w-4" /> Khám phá theo vị trí</p>
            <h1 className="mt-3 text-[2.1rem] font-extrabold leading-tight tracking-tight text-stone-950 sm:text-5xl">Bản đồ sân <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">bóng rổ</span></h1>
            <p className="mt-3 max-w-2xl leading-7 text-stone-500">Chọn khu vực để Google Maps tìm các sân bóng rổ phù hợp trực tiếp trên bản đồ.</p>
          </div>
          <Link to="/fields" className="btn-outline inline-flex min-h-12 animate-fade-in-up items-center justify-center gap-2 self-start rounded-xl px-5 text-sm font-extrabold md:self-auto" style={{ animationDelay: "0.08s" }}><List className="h-4 w-4 text-brand-600" /> Xem danh sách sân</Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section aria-label="Bộ lọc bản đồ" className="mb-6 grid gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-soft md:grid-cols-[minmax(0,1fr)_180px_200px_auto]">
          <label className="relative"><span className="sr-only">Tìm sân</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên sân hoặc địa chỉ..." className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 pl-11 pr-4 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100" /></label>
          <label><span className="sr-only">Thành phố</span><select value={city} onChange={(event) => setCity(event.target.value)} className={controlClass}><option value="all">3 thành phố lớn</option>{majorCities.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
          <label><span className="sr-only">Quận / huyện</span><select value={district} disabled={city === "all"} onChange={(event) => setDistrict(event.target.value)} className={controlClass}><option value="all">{city === "all" ? "Chọn thành phố trước" : "Tất cả quận / huyện"}</option>{districts.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
          <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm text-stone-600" aria-live="polite"><SlidersHorizontal className="h-4 w-4 text-brand-600" /><strong className="font-extrabold text-brand-800">{loading ? "…" : filteredFields.length}</strong> sân</div>
        </section>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]" role="status" aria-live="polite">
            <span className="sr-only">Đang tải vị trí các sân...</span>
            <div className="space-y-3">{[0, 1, 2, 3].map((item) => <div key={item} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"><div className="skeleton h-5 w-2/3" /><div className="skeleton h-3.5 w-full" /><div className="skeleton h-3.5 w-1/2" /></div>)}</div>
            <div className="skeleton min-h-[500px] rounded-3xl" />
          </div>
        ) : !filteredFields.length ? (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-white px-6 py-20 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MapPin className="h-7 w-7" /></span>
            <h2 className="mt-5 text-xl font-extrabold text-stone-950">Không có sân phù hợp</h2>
            <p className="mt-2 text-sm text-stone-500">Hãy mở rộng khu vực tìm kiếm sân bóng rổ.</p>
            <Link to="/fields" className="btn-outline mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold">Xem tất cả sân</Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside aria-label="Danh sách sân" className="custom-scrollbar max-h-[72vh] space-y-3 overflow-y-auto p-1 lg:max-h-[640px]">
              {filteredFields.map((field, index) => {
                const active = selectedId === field.id;
                return (
                  <button key={field.id} type="button" aria-pressed={active} onClick={() => focusField(field)} className={`w-full animate-fade-in-up rounded-2xl border p-4 text-left transition duration-200 ${active ? "border-brand-400 bg-brand-50 shadow-soft ring-1 ring-brand-300" : "border-stone-200 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"}`} style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="line-clamp-1 font-extrabold text-stone-950">{field.name}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${active ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600"}`}>Bóng rổ</span>
                    </div>
                    <p className="mt-2 flex gap-1.5 text-xs leading-5 text-stone-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />{field.address}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-200/70 pt-3 text-xs">
                      <span className="font-extrabold text-brand-700">Từ {formatCurrency(field.priceFrom ?? field.pricePerHour ?? 0)}/giờ</span>
                      <span className="flex items-center gap-1">
                        <Link to={`/field/${field.id}`} onClick={(event) => event.stopPropagation()} className="inline-flex min-h-9 items-center rounded-lg px-2 font-bold text-stone-600 hover:bg-white hover:text-brand-700">Chi tiết</Link>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${field.lat != null ? `${field.lat},${field.lng}` : encodeURIComponent(field.address)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-bold text-brand-700 hover:bg-white"><Navigation className="h-3.5 w-3.5" /> Chỉ đường</a>
                      </span>
                    </div>
                  </button>
                );
              })}
            </aside>
            <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-stone-200 bg-stone-100 shadow-soft lg:min-h-[640px]">
              <iframe key={mapQuery} title={`Google Maps - ${mapQuery}`} src={googleEmbedUrl} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
              <div className="pointer-events-none absolute left-4 right-4 top-4 flex sm:right-auto"><span className="inline-flex max-w-full items-center gap-2 truncate rounded-xl border border-stone-200 bg-white/95 px-3 py-2 text-xs font-bold text-stone-700 shadow-soft backdrop-blur"><Search className="h-3.5 w-3.5 shrink-0 text-brand-600" /><span className="truncate">Google đang tìm: {mapQuery}</span></span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
