import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Car, ChevronRight, Clock, Droplets, ExternalLink, Lightbulb, MapPin, Navigation, RotateCcw,
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

  const pillClass = (active) => "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-xs font-bold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 " + (active ? "border-brand-500 bg-brand-50 text-brand-800 shadow-sm" : "border-stone-200 bg-white text-stone-600 hover:border-brand-200 hover:text-stone-900");
  const optionRowClass = (active) => "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 " + (active ? "bg-brand-50 font-bold text-stone-900" : "text-stone-600 hover:bg-stone-50");
  const activeFilterCount = (city !== "all" ? 1 : 0) + (distance !== "all" ? 1 : 0) + (facilityType !== "all" ? 1 : 0) + amenities.length;

  const filters = (
    <aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <h2 className="flex items-center gap-2 font-extrabold text-stone-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><SlidersHorizontal className="h-4 w-4" /></span>
          Bộ lọc
          {activeFilterCount > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">{activeFilterCount}</span>}
        </h2>
        <button type="button" onClick={resetFilters} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-stone-500 transition-colors hover:bg-brand-50 hover:text-brand-700"><RotateCcw className="h-3.5 w-3.5" /> Đặt lại</button>
      </div>
      <div className="mt-5 space-y-6">
        <FilterSelect label="Tỉnh / thành phố" value={city} setValue={setCity} options={cities} allLabel="Tất cả khu vực" />
        <fieldset>
          <legend className="text-xs font-extrabold uppercase tracking-wider text-stone-500">Khoảng cách</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[["all", "Gần nhất"], ["3", "Dưới 3 km"], ["5", "Dưới 5 km"], ["10", "Dưới 10 km"]].map(([value, label]) => (
              <label key={value} className={pillClass(distance === value)}>
                <input type="radio" name="distance" className="sr-only" checked={distance === value} onChange={() => { setDistance(value); setPage(1); }} />{label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-extrabold uppercase tracking-wider text-stone-500">Loại sân</legend>
          <div className="mt-2 space-y-1">
            {["all", ...facilityTypes].map((value) => (
              <label key={value} className={optionRowClass(facilityType === value)}>
                <input type="radio" name="facilityType" checked={facilityType === value} onChange={() => { setFacilityType(value); setPage(1); }} className="h-4 w-4 accent-brand-600" />
                {value === "all" ? "Tất cả loại sân" : "Sân " + value.toLowerCase()}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-extrabold uppercase tracking-wider text-stone-500">Tiện ích</legend>
          <div className="mt-2 space-y-1">
            {amenityOptions.map(({ value, label, icon: Icon }) => (
              <label key={value} className={optionRowClass(amenities.includes(value))}>
                <input type="checkbox" checked={amenities.includes(value)} onChange={() => toggleAmenity(value)} className="h-4 w-4 rounded accent-brand-600" />
                <Icon className={"h-4 w-4 " + (amenities.includes(value) ? "text-brand-600" : "text-stone-400")} />{label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface text-stone-900">
      <section className="relative overflow-hidden border-b border-stone-200/70 bg-white">
        <div className="brand-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black_15%,transparent_65%)]" aria-hidden />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex animate-fade-in items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500"><Link to="/" className="hover:text-brand-700">Trang chủ</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-brand-700">Sân tập</span></nav>
          <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="animate-fade-in-up">
              <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-tight text-stone-950 sm:text-5xl">Sân bóng rổ <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">gần bạn</span></h1>
              <p className="mt-3 max-w-xl leading-7 text-stone-500">Tìm sân bóng rổ theo vị trí, khoảng cách và tiện ích bạn cần.</p>
            </div>
            <Link to={mapHref} className="btn-outline inline-flex min-h-12 animate-fade-in-up items-center justify-center gap-2 self-start rounded-xl px-5 text-sm font-extrabold lg:self-auto" style={{ animationDelay: "0.08s" }}><MapPin className="h-4 w-4 text-brand-600" /> Tìm bằng Google Maps</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-7 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-soft sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Tìm theo tên sân hoặc địa chỉ</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="Tìm theo tên sân hoặc địa chỉ..." className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 pl-12 pr-10 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100" />
            {keyword && <button type="button" aria-label="Xóa từ khóa" onClick={() => { setKeyword(""); setPage(1); }} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="h-4 w-4" /></button>}
          </label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowFilters(true)} className="btn-outline inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold sm:flex-none lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Bộ lọc{activeFilterCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-extrabold text-white">{activeFilterCount}</span>}</button>
            <span className="whitespace-nowrap rounded-xl bg-brand-50 px-4 py-3 text-sm text-stone-600" aria-live="polite"><strong className="font-extrabold text-brand-800">{loading ? "…" : filtered.length}</strong> sân phù hợp</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden lg:block"><div className="sticky top-28">{filters}</div></div>
          <main className="min-w-0">
            {!loading && <section id="google-results" className="mb-7 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
              <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="eyebrow">Kết quả từ Google Maps</p><h2 className="mt-1 truncate text-lg font-extrabold text-stone-950">{googleMapQuery}</h2></div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapQuery)}`} target="_blank" rel="noreferrer" className="btn-outline inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" /> Mở bản đồ lớn</a>
              </div>
              <div className="relative h-[240px] bg-stone-100 sm:h-[400px]"><iframe key={googleMapQuery} title={`Google Maps - ${googleMapQuery}`} src={googleEmbedUrl} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
            </section>}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2" role="status" aria-live="polite">
                <span className="sr-only">Đang tải danh sách sân...</span>
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
                    <div className="skeleton h-56 rounded-none" />
                    <div className="space-y-3 p-6"><div className="skeleton h-6 w-3/4" /><div className="skeleton h-4 w-2/3" /><div className="flex gap-2"><div className="skeleton h-6 w-20" /><div className="skeleton h-6 w-32" /></div><div className="skeleton mt-5 h-11 w-full" /></div>
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand-200 bg-white px-6 py-16 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Search className="h-7 w-7" /></span>
                <h2 className="mt-5 text-2xl font-extrabold text-stone-950">Không tìm thấy sân phù hợp</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">Hãy mở rộng khu vực hoặc bỏ bớt tiện ích.</p>
                <button type="button" onClick={resetFilters} className="btn-primary mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold"><RotateCcw className="h-4 w-4" /> Xóa bộ lọc</button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {paginated.map((field, index) => <FieldCard key={field.id} field={field} detailQuery={detailQuery} index={index} />)}
              </div>
            )}
            {totalPages > 1 && <nav aria-label="Phân trang" className="mt-10 flex flex-wrap justify-center gap-2">{Array.from({ length: totalPages }, (_, index) => <button key={index} type="button" aria-label={`Trang ${index + 1}`} aria-current={page === index + 1 ? "page" : undefined} onClick={() => setPage(index + 1)} className={"h-11 w-11 rounded-xl text-sm font-bold transition " + (page === index + 1 ? "bg-brand-600 text-white shadow-brand" : "border border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700")}>{index + 1}</button>)}</nav>}
          </main>
        </div>
      </div>

      {showFilters && <div className="fixed inset-0 z-[70] animate-fade-in bg-stone-950/40 backdrop-blur-sm lg:hidden" onClick={() => setShowFilters(false)}><div role="dialog" aria-modal="true" aria-label="Bộ lọc sân" className="ml-auto flex h-full w-[min(90vw,360px)] animate-fade-in flex-col overflow-y-auto bg-surface p-4" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex items-center justify-between"><p className="text-lg font-extrabold text-stone-950">Lọc sân</p><button type="button" aria-label="Đóng bộ lọc" onClick={() => setShowFilters(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-sm hover:text-brand-700"><X className="h-5 w-5" /></button></div>{filters}<button type="button" onClick={() => setShowFilters(false)} className="btn-primary sticky bottom-3 mt-4 h-12 w-full shrink-0 rounded-xl text-sm font-extrabold">Xem {filtered.length} kết quả</button></div></div>}
    </div>
  );
}

function FilterSelect({ label, value, setValue, options, allLabel }) {
  return <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-stone-500">{label}</span><select value={value} onChange={(event) => setValue(event.target.value)} className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100">{options.map((option) => <option key={option} value={option}>{option === "all" ? allLabel : option}</option>)}</select></label>;
}

function FieldCard({ field, detailQuery, index }) {
  const rating = Number(field.rating) > 0 ? Number(field.rating).toFixed(1) : field.rating == null ? "4.8" : "Mới";
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: (index * 0.05) + "s" }}>
      <Link to={"/field/" + field.id + detailQuery} className="field-card group flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft hover:border-brand-200">
        <div className="zoom-media relative h-56 bg-stone-100">
          <img src={field.imageUrl || field.image} alt={field.name} loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-stone-950/25 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-stone-800 shadow-sm backdrop-blur">{field.sportLabel || field.type}</span>
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-extrabold text-stone-900 shadow-sm backdrop-blur"><Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />{rating}</span>
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm"><Navigation className="h-3 w-3" />{field.distance} km</span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <h2 className="line-clamp-1 text-xl font-extrabold text-stone-950 transition-colors group-hover:text-brand-700">{field.name}</h2>
          <p className="mt-2 flex items-start gap-2 text-sm text-stone-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span className="line-clamp-2">{field.address}</span></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700">{field.facilityType}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><Clock className="h-3 w-3" />Mở cửa {field.openTime || "06:00"} - {field.closeTime || "22:00"}</span>
          </div>
          <div className="mt-5 flex flex-1 items-end">
            <div className="flex w-full items-center justify-between border-t border-stone-100 pt-5">
              <div><p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Giá từ</p><p className="mt-0.5 text-lg font-extrabold text-brand-700">{formatCurrency(field.priceFrom || field.pricePerHour)}<span className="text-xs font-semibold text-stone-500"> / giờ</span></p></div>
              <span className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-50 px-4 text-sm font-extrabold text-brand-700 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">Đặt sân <ChevronRight className="h-4 w-4" /></span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
