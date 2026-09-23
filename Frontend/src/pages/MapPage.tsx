import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MapPin, Navigation, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { fetchFields, Field, formatCurrency } from "../lib/api";
import { demoFields } from "../data/demoData";
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
    fetchFields().then((data) => {
      setFields([...data, ...demoFields.filter((demo) => !data.some((field) => field.id === demo.id))]);
    }).catch(() => { toast.error("Không tải được danh sách sân"); setFields(demoFields); }).finally(() => setLoading(false));
  }, []);

  const showingDemoFields = fields.some((field) => field.id >= 101 && field.id <= 107);
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

  return <div className="min-h-screen bg-[#f7f8f6] px-4 py-8 text-slate-900 sm:py-12"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:p-8"><div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-600"><Sparkles className="h-4 w-4" /> Khám phá theo vị trí</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Bản đồ sân bóng rổ</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Chọn khu vực để Google Maps tìm các sân bóng rổ phù hợp trực tiếp trên bản đồ.</p>{showingDemoFields && <p className="mt-2 text-xs font-medium text-emerald-700">Danh sách bên trái có thể gồm dữ liệu minh hoạ khi hệ thống chưa có sân thật.</p>}</div><Link to="/fields" className="btn-outline inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold">Xem danh sách sân</Link></header>
    <section className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_170px_190px_auto]"><label className="relative"><span className="sr-only">Tìm sân</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên sân hoặc địa chỉ..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-amber-400 focus:bg-white" /></label><select value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400"><option value="all">3 thành phố lớn</option>{majorCities.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select><select value={district} disabled={city === "all"} onChange={(event) => setDistrict(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-55 focus:border-amber-400"><option value="all">{city === "all" ? "Chọn thành phố trước" : "Tất cả quận / huyện"}</option>{districts.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select><div className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"><SlidersHorizontal className="h-4 w-4 text-amber-400" /> {filteredFields.length} sân</div></section>
    {loading ? <div className="flex min-h-96 flex-col items-center justify-center gap-3"><Loader2 className="h-9 w-9 animate-spin text-amber-500" /><p className="text-sm font-semibold text-slate-500">Đang tải vị trí các sân...</p></div> : !filteredFields.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"><MapPin className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-4 text-xl font-extrabold">Không có sân phù hợp</h2><p className="mt-2 text-sm text-slate-500">Hãy mở rộng khu vực tìm kiếm sân bóng rổ.</p></div> : <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><aside className="max-h-[72vh] space-y-3 overflow-y-auto pr-1 custom-scrollbar">{filteredFields.map((field) => { const active = selectedId === field.id; return <button key={field.id} type="button" onClick={() => focusField(field)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-amber-400 bg-amber-50 shadow-sm" : "border-slate-200 bg-white hover:border-amber-300"}`}><div className="flex items-start justify-between gap-3"><h2 className="line-clamp-1 font-extrabold text-slate-950">{field.name}</h2><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Bóng rổ</span></div><p className="mt-2 flex gap-1.5 text-xs leading-5 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />{field.address}</p><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="font-extrabold text-amber-700">Từ {formatCurrency(field.priceFrom ?? field.pricePerHour ?? 0)}/giờ</span><span className="flex gap-3"><Link to={`/field/${field.id}`} onClick={(event) => event.stopPropagation()} className="font-bold text-slate-600 hover:text-amber-700">Chi tiết</Link><a href={`https://www.google.com/maps/dir/?api=1&destination=${field.lat != null ? `${field.lat},${field.lng}` : encodeURIComponent(field.address)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 font-bold text-amber-700 hover:underline"><Navigation className="h-3.5 w-3.5" /> Chỉ đường</a></span></div></button>; })}</aside><div className="relative min-h-[500px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm"><iframe key={mapQuery} title={`Google Maps - ${mapQuery}`} src={googleEmbedUrl} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /><div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">Google đang tìm: {mapQuery}</div></div></div>}
  </div></div>;
}
