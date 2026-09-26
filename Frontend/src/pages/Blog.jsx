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

  const [featured, ...rest] = filteredBlogs;
  const showFeatured = Boolean(featured) && !searchTerm && selectedCategory === "all";
  const gridItems = showFeatured ? rest : filteredBlogs;

  return (
    <div className="min-h-screen bg-surface text-stone-700">
      <section className="relative overflow-hidden border-b border-stone-200 bg-white px-4 pb-12 pt-14 md:pb-16 md:pt-20">
        <div className="brand-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-brand-200/50 blur-[100px]" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-3xl text-center animate-fade-in-up">
          <span className="eyebrow rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Tin tức chính thức
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-stone-950 md:text-5xl">
            Tin tức <span className="text-brand-600">VBA</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-600">
            Cập nhật tin mới nhất từ Giải Bóng Rổ Chuyên Nghiệp Việt Nam (VBA).
          </p>
          <p className="mt-2 text-xs font-semibold text-stone-500">Nguồn: VBA</p>

          <div className="relative mx-auto mt-8 max-w-lg">
            <label htmlFor="blog-search" className="sr-only">Tìm kiếm bài viết</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input id="blog-search" type="search" placeholder="Tìm kiếm bài viết, chủ đề..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-12 pr-4 text-sm text-stone-800 shadow-soft outline-none transition-all placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15" />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Lọc theo chủ đề">
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <button key={category} type="button" aria-pressed={active} onClick={() => setSelectedCategory(category)} className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-all ${active ? "border-brand-600 bg-brand-600 text-white shadow-brand" : "border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"}`}>
                  {category === "all" ? "Tất cả chủ đề" : category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Đang tải tin tức VBA">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="card overflow-hidden">
                <div className="skeleton h-52 !rounded-none" />
                <div className="space-y-3 p-6"><div className="skeleton h-4 w-24" /><div className="skeleton h-5 w-full" /><div className="skeleton h-5 w-3/4" /><div className="skeleton h-3 w-full" /></div>
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="card mx-auto max-w-md p-12 text-center">
            <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
              <Newspaper className="h-8 w-8" aria-hidden="true" />
            </span>
            <h3 className="mb-2 text-xl font-extrabold text-stone-950">{loadError || "Không tìm thấy bài viết"}</h3>
            <p className="mb-6 text-sm leading-relaxed text-stone-600">{loadError ? "Vui lòng tải lại trang sau ít phút." : "Thử tìm kiếm với từ khóa khác hoặc chọn tất cả danh mục."}</p>
            {!loadError && <button type="button" onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }} className="btn-outline min-h-11 rounded-xl px-6 text-sm">Xem tất cả bài viết</button>}
          </div>
        ) : (
          <>
            {showFeatured && (
              <a href={featured.sourceUrl} target="_blank" rel="noreferrer" className="card group mb-8 grid overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-brand-200 hover:shadow-lift lg:grid-cols-[1.25fr_1fr]" data-reveal>
                <div className="zoom-media relative h-60 bg-stone-100 sm:h-80 lg:h-full lg:min-h-[360px]">
                  <img src={featured.image || banner2} alt={featured.title} onError={(event) => { event.currentTarget.src = banner2; }} className="h-full w-full object-cover" />
                  <span className="absolute left-4 top-4 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-brand">Nổi bật</span>
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <span className="eyebrow">{featured.category}</span>
                  <h2 className="mt-3 line-clamp-3 text-2xl font-extrabold leading-tight text-stone-950 transition-colors group-hover:text-brand-700 sm:text-3xl">{featured.title}</h2>
                  <p className="mt-4 line-clamp-4 text-base leading-relaxed text-stone-600">{featured.desc}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5 text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-stone-500"><CalendarDays className="h-4 w-4 text-brand-600" aria-hidden="true" />{featured.date}</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-brand-700 transition-transform group-hover:translate-x-1">Đọc tại VBA <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                  </div>
                </div>
              </a>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gridItems.map((item, index) => (
                <a key={item.id} href={item.sourceUrl} target="_blank" rel="noreferrer" data-reveal style={{ "--reveal-index": index % 3 }} className="card hover-lift group flex h-full flex-col overflow-hidden hover:border-brand-200">
                  <div className="zoom-media relative h-52 bg-stone-100">
                    <img src={item.image || banner2} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.src = banner2; }} className="h-full w-full object-cover" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-800 shadow-soft backdrop-blur">{item.category}</span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <h2 className="mb-3 line-clamp-2 text-lg font-extrabold leading-snug text-stone-950 transition-colors group-hover:text-brand-700">{item.title}</h2>
                      <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-stone-600">{item.desc}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-stone-500"><CalendarDays className="h-4 w-4 text-brand-600" aria-hidden="true" />{item.date}</span>
                      <span className="inline-flex items-center gap-1 font-bold text-brand-700 transition-transform group-hover:translate-x-1">Đọc tại VBA <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
