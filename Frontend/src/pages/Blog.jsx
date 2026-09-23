import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, CalendarDays, ArrowRight, Sparkles } from "lucide-react";
import { blogs } from "./blogData";
import { api } from "../lib/api";
import banner2 from "../assets/banner2.jpg";

export default function Blog() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [news, setNews] = useState(blogs);
  const [newsSource, setNewsSource] = useState("local");

  useEffect(() => {
    let active = true;
    api.get("/news", { params: { limit: 18 } })
      .then((response) => {
        if (!active || !response.data?.items?.length) return;
        setNews(response.data.items);
        setNewsSource(response.data.source || "rss");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const categories = ["all", ...Array.from(new Set(news.map((b) => b.category)))];

  const filteredBlogs = news.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "all" || b.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-700">
      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white px-4 py-16 text-center md:py-20">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/45 blur-[120px]" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Sparkles className="w-4 h-4" /> Kiến thức & Cẩm nang bóng rổ
          </div>
          <h1 className="mb-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            Tin Tức & Kinh Nghiệm Thi Đấu
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
            Tổng hợp chiến thuật, kỹ năng, dinh dưỡng và tin bóng rổ được cập nhật tự động.
          </p>
          {newsSource === "rss" && <p className="-mt-4 mb-6 text-xs font-medium text-emerald-700">Đang cập nhật tin bóng rổ từ nguồn công khai</p>}

          {/* Search bar */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategory === cat
                    ? "border-amber-400 bg-amber-400 text-slate-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-slate-950"
                }`}
              >
                {cat === "all" ? "Tất cả chủ đề" : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        {filteredBlogs.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="text-5xl mb-4 opacity-70">📖</div>
            <h3 className="mb-2 text-xl font-bold text-slate-950">Không tìm thấy bài viết</h3>
            <p className="mb-6 text-xs text-slate-500">Thử tìm kiếm với từ khóa khác hoặc chọn tất cả danh mục.</p>
            <button
              onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}
              className="btn-outline px-6 py-2.5 rounded-xl text-xs"
            >
              Xem tất cả bài viết
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((item) => (
              <article
                key={item.id}
                onClick={() => item.sourceUrl ? window.open(item.sourceUrl, "_blank", "noopener,noreferrer") : navigate(`/blog/${item.id}`)}
                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
              >
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <img
                    src={item.image || banner2}
                    alt={item.title}
                    onError={(event) => { event.currentTarget.src = banner2; }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="rounded-full border border-white/30 bg-slate-950/75 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-md">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="mb-3 line-clamp-2 text-lg font-black text-slate-950 transition-colors group-hover:text-amber-700">
                      {item.title}
                    </h2>
                    <p className="mb-6 line-clamp-3 text-xs leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                      {item.date}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 transition-transform group-hover:translate-x-1">
                      {item.sourceUrl ? "Đọc tại nguồn" : "Đọc chi tiết"} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
