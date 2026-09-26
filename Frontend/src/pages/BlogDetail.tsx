import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronRight, Sparkles, Clock } from "lucide-react";
import { blogs } from "./blogData";

export default function BlogDetail() {
  const { id } = useParams();
  const post = blogs.find((item) => item.id === Number(id));

  if (!post) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface px-4 py-24 text-center text-stone-700">
        <span className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
          <BookOpen className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold text-stone-950">Không tìm thấy bài viết</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">Bài viết có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/blog" className="btn-primary mt-6 min-h-11 rounded-xl px-6 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại Blog
        </Link>
      </div>
    );
  }

  const related = blogs
    .filter((item) => item.id !== post.id && item.category === post.category)
    .concat(blogs.filter((item) => item.id !== post.id && item.category !== post.category))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-surface pb-20 text-stone-700">
      {/* Header Banner */}
      <header className="relative overflow-hidden border-b border-stone-200 bg-white px-4 pb-12 pt-10 sm:px-8 sm:pt-14">
        <div className="brand-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_70%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-200/45 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-5xl animate-fade-in-up">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-stone-500">
            <Link to="/blog" className="inline-flex min-h-11 items-center gap-1.5 font-semibold transition-colors hover:text-brand-700">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tin tức
            </Link>
            <ChevronRight className="h-4 w-4 text-stone-300" aria-hidden="true" />
            <span className="font-semibold text-stone-700">{post.category}</span>
          </nav>

          <span className="chip">{post.category}</span>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-[1.15] tracking-tight text-stone-950 sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-stone-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-brand-600" aria-hidden="true" /> Ngày đăng: {post.date}
            </span>
            <span aria-hidden="true" className="text-stone-300">•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" /> 5 phút đọc
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-0">
        <article className="card overflow-hidden" data-reveal>
          <div className="relative h-64 w-full overflow-hidden bg-stone-100 sm:h-96">
            <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <p className="mb-8 max-w-[65ch] rounded-r-2xl border-l-4 border-brand-500 bg-brand-50 py-3 pl-5 pr-4 text-lg font-semibold leading-relaxed text-brand-950">
              {post.desc}
            </p>

            <div className="max-w-[65ch] space-y-6 text-[17px] leading-[1.8] text-stone-700">
              {post.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-12 flex flex-col gap-4 border-t border-stone-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Link to="/blog" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-700 hover:underline">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Khám phá thêm bài viết khác
              </Link>
              <Link to="/fields" className="btn-primary min-h-11 rounded-xl px-5 text-sm">
                Đặt sân thi đấu ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="card p-6" data-reveal style={{ "--reveal-index": 1 } as React.CSSProperties}>
            <h2 className="mb-5 flex items-center gap-2 text-base font-extrabold text-stone-950">
              <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" /> Bài viết nổi bật
            </h2>
            <div className="space-y-5">
              {related.map((item) => (
                <Link key={item.id} to={`/blog/${item.id}`} className="group block rounded-2xl">
                  <div className="zoom-media mb-3 h-32 w-full rounded-2xl bg-stone-100">
                    <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-700">
                    {item.category}
                  </span>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-stone-900 transition-colors group-hover:text-brand-700">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-brand" data-reveal style={{ "--reveal-index": 2 } as React.CSSProperties}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-400/40 blur-2xl" aria-hidden="true" />
            <h2 className="relative text-lg font-extrabold">Sẵn sàng ra sân?</h2>
            <p className="relative mt-2 text-sm leading-relaxed text-white/90">Tìm sân gần bạn và đặt lịch chỉ trong 60 giây.</p>
            <Link to="/fields" className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-700 transition hover:bg-brand-50">
              Tìm sân ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
