import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Sparkles, Clock } from "lucide-react";
import { blogs } from "./blogData";

export default function BlogDetail() {
  const { id } = useParams();
  const post = blogs.find((item) => item.id === Number(id));

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f6] px-4 py-28 text-center text-slate-700">
        <div className="text-6xl mb-4 opacity-70">📖</div>
        <h1 className="text-2xl font-black text-slate-950">Không tìm thấy bài viết</h1>
        <p className="mt-2 text-sm text-slate-500">Bài viết có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
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
    <div className="min-h-screen bg-[#f7f8f6] pb-20 text-slate-700">
      {/* Header Banner */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-white px-4 py-16 sm:px-8">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-200/45 blur-3xl" />

        <div className="mx-auto max-w-5xl relative z-10">
          <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-amber-700">
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài viết
          </Link>

          <div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-amber-700">
              {post.category}
            </span>
            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-5 flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-amber-500" /> Ngày đăng: {post.date}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" /> 5 phút đọc
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto grid max-w-5xl gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-0">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-72 w-full overflow-hidden bg-slate-100 sm:h-96">
            <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
          </div>

          <div className="p-6 sm:p-10">
            <div className="mb-8 rounded-r-2xl border-l-4 border-amber-400 bg-amber-50 py-1 pl-4 text-base font-bold leading-relaxed text-amber-900">
              {post.desc}
            </div>

            <div className="space-y-6 text-sm leading-relaxed text-slate-600">
              {post.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-8">
              <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:underline">
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-base font-black text-slate-950">
              <Sparkles className="h-4 w-4 text-amber-500" /> Bài viết nổi bật
            </h2>
            <div className="space-y-5">
              {related.map((item) => (
                <Link key={item.id} to={`/blog/${item.id}`} className="group block">
                  <div className="mb-3 h-32 w-full overflow-hidden rounded-2xl bg-slate-100">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  </div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700">
                    {item.category}
                  </span>
                  <h3 className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-amber-700">
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
