import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFields } from "../lib/api";
import { Search, MapPin, SlidersHorizontal, ChevronDown, Loader2, Grid3X3, List, ChevronRight, Star } from "lucide-react";
import { formatCurrency } from "../lib/api";

const PAGE_SIZE = 9;

export default function FieldPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [sport, setSport] = useState("all");
  const [city, setCity] = useState("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFields();
        setFields(data);
      } catch {
        setFields([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sports = useMemo(() => {
    const s = new Set(fields.map((f) => f.sportLabel));
    return ["all", ...Array.from(s)];
  }, [fields]);

  const cities = useMemo(() => {
    const s = new Set(fields.map((f) => f.city));
    return ["all", ...Array.from(s)];
  }, [fields]);

  const filtered = useMemo(() => {
    return fields.filter((f) => {
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        f.name.toLowerCase().includes(kw) ||
        f.address.toLowerCase().includes(kw);
      const matchSport = sport === "all" || f.sportLabel === sport;
      const matchCity = city === "all" || f.city === city;
      return matchKw && matchSport && matchCity;
    });
  }, [fields, keyword, sport, city]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const SelectBox = ({ value, onChange, options, placeholder }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); setPage(1); }}
        className="w-full appearance-none bg-black border border-white/10 focus:border-yellow-500 text-gray-300 text-sm font-medium rounded-xl px-4 py-3.5 pr-10 outline-none transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-300">
      {/* ── Page Header ── */}
      <div className="bg-[var(--color-primary)] border-b border-white/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 pt-12 pb-24 relative z-10">
          {/* Breadcrumb */}
          <div className="text-xs text-gray-500 mb-4 flex items-center gap-2 tracking-wide uppercase font-bold">
            <Link to="/" className="hover:text-yellow-400 transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-yellow-500">Danh sách sân</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Khám Phá Cơ Sở Thể Thao
          </h1>
          <p className="text-gray-400 text-lg">
            Đã tìm thấy <strong className="text-yellow-400 text-xl">{filtered.length}</strong> cơ sở phù hợp với bạn
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="max-w-7xl mx-auto px-4 -mt-12 mb-10 relative z-20">
        <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-6">
            <SlidersHorizontal className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">Bộ lọc tìm kiếm</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Keyword */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tên sân, khu vực, địa chỉ..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                className="w-full bg-black border border-white/10 focus:border-yellow-500 text-white text-sm font-medium rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            <SelectBox
              value={sport}
              onChange={setSport}
              options={sports.map((s) => ({ value: s, label: s === "all" ? "⚽ Tất cả bộ môn" : s }))}
              placeholder="Bộ môn"
            />

            <SelectBox
              value={city}
              onChange={setCity}
              options={cities.map((c) => ({ value: c, label: c === "all" ? "📍 Tất cả khu vực" : c }))}
              placeholder="Khu vực"
            />
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm text-gray-500 font-medium">
            Hiển thị <strong className="text-white">{paginated.length}</strong> / {filtered.length} kết quả
          </span>
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-black text-yellow-500 shadow-sm border border-white/5" : "text-gray-500 hover:text-white"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-black text-yellow-500 shadow-sm border border-white/5" : "text-gray-500 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
            <p className="text-gray-500 text-sm font-medium">Đang tải danh sách sân...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="bg-zinc-900 rounded-3xl p-16 text-center border border-white/5 shadow-sm">
            <div className="text-6xl mb-6 opacity-80">🏟️</div>
            <h3 className="text-2xl font-extrabold text-white mb-3">Không tìm thấy sân phù hợp</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">Chúng tôi không tìm thấy cơ sở nào khớp với bộ lọc hiện tại của bạn. Thử thay đổi từ khóa hoặc mở rộng khu vực.</p>
            <button
              onClick={() => { setKeyword(""); setSport("all"); setCity("all"); setPage(1); }}
              className="btn-outline px-8 py-3.5 rounded-xl text-sm"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {paginated.map((item, i) => (
              <Link
                key={item.id}
                to={`/field/${item.id}`}
                className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group field-card flex flex-col h-full hover:border-yellow-500/30 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="relative h-56 overflow-hidden bg-black">
                  <img
                    src={item.imageUrl || item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-90" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-black/60 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                      {item.sportLabel || item.type}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-white text-xs font-bold">{item.rating?.toFixed(1) || "4.8"}</span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-yellow-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-start gap-2 mb-4 line-clamp-2">
                      <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      {item.address}
                    </p>
                  </div>
                  <div className="pt-5 border-t border-white/10 flex items-center justify-between mt-auto">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Giá từ</p>
                      <p className="text-yellow-400 font-bold text-lg">
                        {formatCurrency(item.priceFrom || item.pricePerHour)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="flex flex-col gap-5">
            {paginated.map((item, i) => (
              <Link
                key={item.id}
                to={`/field/${item.id}`}
                className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group hover:border-yellow-500/30 transition-colors flex flex-col sm:flex-row animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-full sm:w-64 h-48 sm:h-auto relative overflow-hidden bg-black shrink-0">
                  <img
                    src={item.imageUrl || item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                      {item.sportLabel || item.type}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                        {item.name}
                      </h3>
                      <div className="bg-black/50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/5 shrink-0">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-white text-xs font-bold">{item.rating?.toFixed(1) || "4.8"}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 flex items-start gap-2 mb-4 line-clamp-2">
                      <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      {item.address}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Giá từ</p>
                      <p className="text-yellow-400 font-bold text-xl">
                        {formatCurrency(item.priceFrom || item.pricePerHour)}
                      </p>
                    </div>
                    <button className="btn-primary px-6 py-2.5 rounded-xl text-sm">
                      Đặt sân ngay
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setPage(i + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                  page === i + 1
                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                    : "bg-zinc-900 border border-white/5 text-gray-400 hover:text-white hover:border-white/20"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
