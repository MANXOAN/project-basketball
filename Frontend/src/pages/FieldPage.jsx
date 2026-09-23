import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Car, ChevronRight, Droplets, Lightbulb, Loader2, MapPin, RotateCcw,
  Search, SlidersHorizontal, Star, Wifi, X,
} from "lucide-react";
import { fetchFields, formatCurrency } from "../lib/api";

const PAGE_SIZE = 8;
const distances = [0.5, 1.2, 2.8, 4.4, 7.5, 9.2];
const facilityTypes = ["Trong nhà", "Ngoài trời"];
const amenityOptions = [
  { value: "wifi", label: "Wifi", icon: Wifi },
  { value: "parking", label: "Chỗ để xe", icon: Car },
  { value: "water", label: "Nước uống", icon: Droplets },
  { value: "lighting", label: "Đèn chiếu sáng", icon: Lightbulb },
];

export default function FieldPage() {
  const [searchParams] = useSearchParams();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(() => searchParams.get("q") || "");
  const [city, setCity] = useState("all");
  const [distance, setDistance] = useState("all");
  const [facilityType, setFacilityType] = useState("all");
  const [amenities, setAmenities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const preferredDate = searchParams.get("date") || "";

  useEffect(() => {
    fetchFields().then(setFields).catch(() => setFields([])).finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => fields.map((field, index) => ({
    ...field,
    distance: distances[index % distances.length],
    facilityType: facilityTypes[index % facilityTypes.length],
    amenities: amenityOptions.filter((_, amenityIndex) => (index + amenityIndex) % 3 !== 0).map((item) => item.value),
  })), [fields]);

  const cities = useMemo(() => ["all", ...new Set(items.map((item) => item.city).filter(Boolean))], [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const query = keyword.trim().toLowerCase();
    return (!query || item.name.toLowerCase().includes(query) || item.address.toLowerCase().includes(query))
      && (city === "all" || item.city === city)
      && (distance === "all" || item.distance <= Number(distance))
      && (facilityType === "all" || item.facilityType === facilityType)
      && amenities.every((amenity) => item.amenities.includes(amenity));
  }), [items, keyword, city, distance, facilityType, amenities]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const detailQuery = preferredDate ? "?date=" + encodeURIComponent(preferredDate) : "";
  const mapHref = useMemo(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (city !== "all") params.set("city", city);
    return `/map${params.size ? `?${params.toString()}` : ""}`;
  }, [keyword, city]);
  const googleMapQuery = useMemo(() => [
    keyword.trim(),
    !keyword.trim() ? "sân bóng rổ" : "",
    city === "all" ? "Việt Nam" : city,
  ].filter(Boolean).join(", "), [keyword, city]);
  const googleEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(googleMapQuery)}&z=13&output=embed`;

  const resetFilters = () => {
    setKeyword("");
    setCity("all");
    setDistance("all");
    setFacilityType("all");
    setAmenities([]);
    setPage(1);
  };

  const toggleAmenity = (value) => {
    setAmenities((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setPage(1);
  };

  const filters = (
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-extrabold text-slate-950"><SlidersHorizontal className="h-5 w-5 text-amber-500" /> Chọn lọc theo</h2>
        <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-amber-600"><RotateCcw className="h-3.5 w-3.5" /> Đặt lại</button>
      </div>
      <div className="mt-6 space-y-7">
        <FilterSelect label="Tỉnh / thành phố" value={city} setValue={setCity} options={cities} allLabel="Tất cả khu vực" />
        <fieldset>
          <legend className="text-sm font-extrabold text-slate-900">Khoảng cách</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[["all", "Gần nhất"], ["3", "Dưới 3 km"], ["5", "Dưới 5 km"], ["10", "Dưới 10 km"]].map(([value, label]) => (
              <label key={value} className={"cursor-pointer rounded-xl border px-2 py-2.5 text-center text-xs font-bold transition " + (distance === value ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600")}>
                <input type="radio" name="distance" className="sr-only" checked={distance === value} onChange={() => { setDistance(value); setPage(1); }} />{label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-extrabold text-slate-900">Loại sân</legend>
          <div className="mt-3 space-y-1">
            {["all", ...facilityTypes].map((value) => (
              <label key={value} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-slate-600">
                <input type="radio" name="facilityType" checked={facilityType === value} onChange={() => { setFacilityType(value); setPage(1); }} className="h-4 w-4 accent-amber-500" />
                {value === "all" ? "Tất cả loại sân" : "Sân " + value.toLowerCase()}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-extrabold text-slate-900">Tiện ích</legend>
          <div className="mt-3 space-y-1">
            {amenityOptions.map(({ value, label, icon: Icon }) => (
              <label key={value} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-slate-600">
                <input type="checkbox" checked={amenities.includes(value)} onChange={() => toggleAmenity(value)} className="h-4 w-4 accent-amber-500" />
                <Icon className="h-4 w-4 text-slate-400" />{label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Link to="/" className="hover:text-amber-600">Trang chủ</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-amber-600">Sân tập</span></div>
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div><h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Sân bóng rổ gần bạn</h1><p className="mt-3 text-slate-500">Tìm sân bóng rổ theo vị trí, khoảng cách và tiện ích bạn cần.</p></div>
            <Link to={mapHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white hover:bg-slate-800"><MapPin className="h-4 w-4 text-amber-400" /> Tìm bằng Google Maps</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="Tìm theo tên sân hoặc địa chỉ..." className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100" /></div>
          <button type="button" onClick={() => setShowFilters(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Bộ lọc</button>
          <span className="whitespace-nowrap text-sm text-slate-500"><strong className="text-slate-950">{filtered.length}</strong> sân phù hợp</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden lg:block">{filters}</div>
          <main>
            {!loading && <section id="google-results" className="mb-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Kết quả từ Google Maps</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">{googleMapQuery}</h2></div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapQuery)}`} target="_blank" rel="noreferrer" className="btn-outline inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold">Mở bản đồ lớn</a>
              </div>
              <div className="relative h-[460px] bg-slate-100"><iframe key={googleMapQuery} title={`Google Maps - ${googleMapQuery}`} src={googleEmbedUrl} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
            </section>}
            {loading ? (
              <div className="flex min-h-96 flex-col items-center justify-center gap-3" role="status"><Loader2 className="h-9 w-9 animate-spin text-amber-500" /><p className="text-sm font-semibold text-slate-500">Đang tải danh sách sân...</p></div>
            ) : paginated.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-4 text-2xl font-extrabold">Không tìm thấy sân phù hợp</h2><p className="mt-2 text-sm text-slate-500">Hãy mở rộng khu vực hoặc bỏ bớt tiện ích.</p><button type="button" onClick={resetFilters} className="btn-primary mt-6 rounded-xl px-6 py-3 text-sm font-bold">Xóa bộ lọc</button></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {paginated.map((field, index) => <FieldCard key={field.id} field={field} detailQuery={detailQuery} index={index} />)}
              </div>
            )}
            {totalPages > 1 && <div className="mt-10 flex justify-center gap-2">{Array.from({ length: totalPages }, (_, index) => <button key={index} type="button" onClick={() => setPage(index + 1)} className={"h-11 w-11 rounded-xl text-sm font-bold " + (page === index + 1 ? "bg-amber-400 text-slate-950" : "border border-slate-200 bg-white text-slate-600")}>{index + 1}</button>)}</div>}
          </main>
        </div>
      </div>

      {showFilters && <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setShowFilters(false)}><div className="ml-auto h-full w-[min(90vw,360px)] overflow-y-auto bg-[#f7f8f6] p-4" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex justify-end"><button type="button" aria-label="Đóng bộ lọc" onClick={() => setShowFilters(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm"><X className="h-5 w-5" /></button></div>{filters}<button type="button" onClick={() => setShowFilters(false)} className="btn-primary sticky bottom-3 mt-4 h-12 w-full rounded-xl text-sm font-extrabold">Xem {filtered.length} kết quả</button></div></div>}
    </div>
  );
}

function FilterSelect({ label, value, setValue, options, allLabel }) {
  return <label className="block"><span className="mb-3 block text-sm font-extrabold text-slate-900">{label}</span><select value={value} onChange={(event) => setValue(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-amber-400">{options.map((option) => <option key={option} value={option}>{option === "all" ? allLabel : option}</option>)}</select></label>;
}

function FieldCard({ field, detailQuery, index }) {
  return (
    <Link to={"/field/" + field.id + detailQuery} className="field-card group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm animate-fade-in-up" style={{ animationDelay: (index * 0.05) + "s" }}>
      <div className="relative h-56 overflow-hidden bg-slate-100"><img src={field.imageUrl || field.image} alt={field.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold shadow-sm">{field.sportLabel || field.type}</span><span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1.5 text-xs font-bold text-white"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{field.rating?.toFixed(1) || "4.8"}</span></div>
      <div className="flex flex-1 flex-col p-6"><div className="flex-1"><div className="flex items-start justify-between gap-3"><h2 className="line-clamp-1 text-xl font-extrabold text-slate-950 group-hover:text-amber-600">{field.name}</h2><span className="shrink-0 text-xs font-bold text-emerald-700">{field.distance} km</span></div><p className="mt-2 flex items-start gap-2 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="line-clamp-2">{field.address}</span></p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{field.facilityType}</span><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Mở cửa {field.openTime || "06:00"} - {field.closeTime || "22:00"}</span></div></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Giá từ</p><p className="mt-1 text-lg font-extrabold text-amber-600">{formatCurrency(field.priceFrom || field.pricePerHour)}<span className="text-xs text-slate-400"> / giờ</span></p></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:bg-amber-400"><ChevronRight className="h-5 w-5" /></span></div></div>
    </Link>
  );
}
