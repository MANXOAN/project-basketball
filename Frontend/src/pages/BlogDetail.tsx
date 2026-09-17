import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Sparkles, Clock } from "lucide-react";
import { blogs } from "./blogData";

export default function BlogDetail() {
  const { id } = useParams();
  const post = blogs.find((item) => item.id === Number(id));

  if (!post) {
    return (
      <div className="bg-black text-gray-200 min-h-screen px-4 py-28 text-center flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 opacity-70">📖</div>
        <h1 className="text-2xl font-black text-white">Không tìm thấy bài viết</h1>
        <p className="mt-2 text-sm text-gray-400">Bài viết có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/blog" className="mt-6 btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold">
          <ArrowLeft className="h-4 w-4" /> Quay lại Blog
        </Link>
      </div>
    );
  }

  const related = blogs
    .filter((item) => item.id !== post.id && item.category === post.category)
    .concat(blogs.filter((item) => item.id !== post.id && item.category !== post.category))
    .slice(0, 3);

  return (
    <div className="bg-black text-gray-200 min-h-screen pb-20">
      {/* Header Banner */}
      <div className="bg-zinc-950 border-b border-white/5 px-4 py-16 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-5xl relative z-10">
          <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-yellow-400 transition-colors uppercase tracking-wider mb-6">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài viết
          </Link>

          <div>
            <span className="rounded-full bg-yellow-500/10 border border-yellow-500/30 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-yellow-400">
              {post.category}
            </span>
            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl tracking-tight">
              {post.title}
            </h1>
            <div className="mt-5 flex items-center gap-4 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-yellow-500" /> Ngày đăng: {post.date}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-yellow-500" /> 5 phút đọc
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto grid max-w-5xl gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-0">
        <article className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900 shadow-xl">
          <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-black">
            <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
          </div>

          <div className="p-6 sm:p-10">
            <div className="border-l-4 border-yellow-500 pl-4 py-1 text-base font-bold leading-relaxed text-yellow-200/90 bg-yellow-500/5 rounded-r-2xl mb-8">
              {post.desc}
            </div>

            <div className="space-y-6 text-sm leading-relaxed text-gray-300">
              {post.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-12 border-t border-white/5 pt-8 flex items-center justify-between">
              <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-yellow-400 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Khám phá thêm bài viết khác
              </Link>
              <Link to="/fields" className="btn-primary px-5 py-2.5 rounded-xl text-xs">
                Đặt sân thi đấu ngay 🏀
              </Link>
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="space-y-6 h-fit lg:sticky lg:top-24">
          <div className="rounded-3xl border border-white/5 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-base font-black text-white mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Bài viết nổi bật
            </h2>
            <div className="space-y-5">
              {related.map((item) => (
                <Link key={item.id} to={`/blog/${item.id}`} className="group block">
                  <div className="h-32 w-full rounded-2xl overflow-hidden bg-black mb-3">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-yellow-400">
                    {item.category}
                  </span>
                  <h3 className="mt-1 text-xs font-bold leading-snug text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
