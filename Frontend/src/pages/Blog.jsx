import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, CalendarDays, ArrowRight, Sparkles, BookOpen, Clock } from "lucide-react";
import { blogs } from "./blogData";

export default function Blog() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", ...Array.from(new Set(blogs.map((b) => b.category)))];

  const filteredBlogs = blogs.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "all" || b.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="bg-black text-gray-200 min-h-screen">
      {/* Hero Banner */}
      <section className="bg-zinc-950 border-b border-white/5 px-4 py-20 relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400">
            <Sparkles className="w-4 h-4" /> Kiến thức & Cẩm nang thể thao
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Tin Tức & Kinh Nghiệm Thi Đấu
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Tổng hợp chiến thuật bóng rổ, chế độ dinh dưỡng vận động viên và tin tức sân bãi cập nhật hàng tuần.
          </p>

          {/* Search bar */}
          <div className="max-w-lg mx-auto relative">
            <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 focus:border-yellow-500 text-white rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all placeholder:text-gray-600 shadow-xl"
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
                    ? "bg-yellow-500 text-black border-yellow-500 shadow-md shadow-yellow-500/20"
                    : "bg-zinc-900 text-gray-400 border-white/10 hover:border-yellow-500/40 hover:text-white"
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
          <div className="bg-zinc-900 rounded-3xl border border-white/5 p-16 text-center shadow-xl max-w-md mx-auto">
            <div className="text-5xl mb-4 opacity-70">📖</div>
            <h3 className="text-xl font-bold text-white mb-2">Không tìm thấy bài viết</h3>
            <p className="text-gray-400 text-xs mb-6">Thử tìm kiếm với từ khóa khác hoặc chọn tất cả danh mục.</p>
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
                onClick={() => navigate(`/blog/${item.id}`)}
                className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden group cursor-pointer hover:border-yellow-500/40 transition-all shadow-xl flex flex-col h-full"
              >
                <div className="relative h-56 overflow-hidden bg-black">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/70 backdrop-blur-md text-yellow-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-yellow-500/30">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-black text-white mb-3 group-hover:text-yellow-400 transition-colors line-clamp-2">
                      {item.title}
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-6">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="w-3.5 h-3.5 text-yellow-500" />
                      {item.date}
                    </span>
                    <span className="text-yellow-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Đọc chi tiết <ArrowRight className="w-3.5 h-3.5" />
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