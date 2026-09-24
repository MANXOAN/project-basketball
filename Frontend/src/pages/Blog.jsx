import { useEffect, useState } from "react";
import { Search, CalendarDays, ArrowRight, Sparkles, Newspaper } from "lucide-react";
import { fetchVbaNews } from "../lib/api";
import banner2 from "../assets/banner2.jpg";

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    fetchVbaNews(18)
      .then((items) => {
        if (active) setNews(items);
      })
      .catch(() => {
        if (active) setLoadError("Không thể tải tin từ VBA. Vui lòng thử lại sau.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = ["all", ...Array.from(new Set(news.map((b) => b.category)))];
  const filteredBlogs = news.filter((b) => {
    const matchSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (selectedCategory === "all" || b.category === selectedCategory);
  });

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-700">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white px-4 py-16 text-center md:py-20">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/45 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Sparkles className="h-4 w-4" /> Tin tức chính thức
          </div>
          <h1 className="mb-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Tin tức VBA</h1>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">Cập nhật tin mới nhất từ Giải Bóng Rổ Chuyên Nghiệp Việt Nam (VBA).</p>
          <p className="-mt-4 mb-6 text-xs font-medium text-emerald-700">Nguồn: VBA</p>

          <div className="relative mx-auto max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm bài viết, chủ đề..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100" />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${selectedCategory === category ? "border-amber-400 bg-amber-400 text-slate-950 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-slate-950"}`}>
                {category === "all" ? "Tất cả chủ đề" : category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải tin tức VBA">
            {[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-3xl bg-slate-200" />)}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <Newspaper className="mx-auto mb-4 h-10 w-10 text-slate-400" aria-hidden="true" />
            <h3 className="mb-2 text-xl font-bold text-slate-950">{loadError || "Không tìm thấy bài viết"}</h3>
            <p className="mb-6 text-xs text-slate-500">{loadError ? "Vui lòng tải lại trang sau ít phút." : "Thử tìm kiếm với từ khóa khác hoặc chọn tất cả danh mục."}</p>
            {!loadError && <button onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }} className="btn-outline rounded-xl px-6 py-2.5 text-xs">Xem tất cả bài viết</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlogs.map((item) => (
              <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer" className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-md">
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img src={item.image || banner2} alt={item.title} onError={(event) => { event.currentTarget.src = banner2; }} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute left-4 top-4"><span className="rounded-full border border-white/30 bg-slate-950/75 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-md">{item.category}</span></div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div><h2 className="mb-3 line-clamp-2 text-lg font-black text-slate-950 transition-colors group-hover:text-amber-700">{item.title}</h2><p className="mb-6 line-clamp-3 text-xs leading-relaxed text-slate-500">{item.desc}</p></div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400"><span className="flex items-center gap-1.5 font-medium"><CalendarDays className="h-3.5 w-3.5 text-amber-500" />{item.date}</span><span className="inline-flex items-center gap-1 font-bold text-amber-700 transition-transform group-hover:translate-x-1">Đọc tại VBA <ArrowRight className="h-3.5 w-3.5" /></span></div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
