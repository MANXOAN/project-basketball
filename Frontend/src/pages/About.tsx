import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import banner2 from "../assets/banner2.jpg";

const features = [
  {
    icon: Search,
    title: "Tìm sân trong 60 giây",
    description: "Bộ lọc thông minh theo quận, kích thước sân bóng rổ và tình trạng lịch trống thời gian thực.",
  },
  {
    icon: ShieldCheck,
    title: "Minh bạch & Đảm bảo",
    description: "Hình ảnh thực tế, bảng giá công khai, hoàn tiền 100% nếu có thay đổi từ hệ thống.",
  },
  {
    icon: Clock3,
    title: "Đặt lịch chủ động 24/7",
    description: "Giữ chỗ nhanh, nhận vé điện tử kèm mã QR check-in tiện lợi mà không cần gọi điện thoại.",
  },
];

const reasons = [
  "Mạng lưới sân bóng rổ tiêu chuẩn thi đấu FIBA",
  "Bảng giá và tình trạng lịch trống cập nhật từng giây",
  "Đội ngũ chăm sóc và xử lý sự cố sân bãi 24/7",
  "Tích điểm thưởng và nhận voucher giảm giá cho đội bóng",
];

const stats = [
  { value: "2.400+", label: "Sân bóng rổ toàn quốc" },
  { value: "150K+", label: "Người chơi đặt sân thường xuyên" },
  { value: "24/7", label: "Hỗ trợ check-in và hoàn hủy tức thì" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-surface text-stone-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-white px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="brand-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_25%,transparent_70%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-in-up">
            <span className="eyebrow rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Đam mê bùng nổ trên từng đường bóng
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-950 sm:text-6xl">
              GoldenState kết nối bạn với <span className="text-brand-600">sàn đấu đỉnh cao.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
              Nền tảng đặt sân bóng rổ chuyên nghiệp, giúp các đội bóng tìm kiếm, đặt lịch và ra sân nhanh nhất.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/fields" className="btn-primary min-h-12 rounded-xl px-7 text-sm">
                Tìm sân bóng ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#mission" className="btn-outline min-h-12 rounded-xl px-6 text-sm">
                Khám phá sứ mệnh
              </a>
            </div>
          </div>

          <div className="relative animate-fade-in delay-200">
            <div className="zoom-media group relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift ring-1 ring-stone-200">
              <img src={banner2} alt="Sân bóng rổ GoldenState" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-stone-950/50 to-transparent" aria-hidden="true" />
            </div>
            <div className="glass-panel absolute -bottom-6 left-3 flex items-center gap-3 rounded-2xl px-4 py-3 sm:-left-8 animate-float">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-stone-950">Chuẩn thi đấu FIBA</p>
                <p className="text-xs text-stone-500">Mặt sân & ánh sáng đạt chuẩn</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="mission" className="relative z-20 mx-auto -mt-12 max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 text-white shadow-brand sm:grid-cols-3" data-reveal>
          {stats.map((stat, i) => (
            <div key={stat.label} className={`px-8 py-7 text-center sm:text-left ${i > 0 ? "border-t border-white/20 sm:border-l sm:border-t-0" : ""}`}>
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">{stat.value}</p>
              <p className="mt-1.5 text-sm font-semibold text-white/90">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal>
            <span className="eyebrow">
              <Trophy className="h-4 w-4" aria-hidden="true" /> Sứ mệnh của chúng tôi
            </span>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-stone-950 sm:text-4xl">
              Nâng tầm trải nghiệm bóng rổ cộng đồng.
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-[1.8] text-stone-600">
              GoldenState xuất phát từ niềm đam mê bóng rổ và khao khát loại bỏ mọi phiền toái khi tìm sân: không còn phải gọi điện dò hỏi lịch trống, không sợ bị trùng giờ thi đấu, thanh toán cọc minh bạch và hoàn tiền công bằng.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm font-semibold leading-snug text-stone-800 shadow-soft">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 p-8 sm:p-12" data-reveal style={{ "--reveal-index": 1 } as React.CSSProperties}>
            <div className="brand-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 text-brand-200" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3v18" />
              <path d="M5.6 5.6c2.6 2.2 3.9 4.3 3.9 6.4s-1.3 4.2-3.9 6.4M18.4 5.6c-2.6 2.2-3.9 4.3-3.9 6.4s1.3 4.2 3.9 6.4" />
            </svg>
            <Quote className="relative mb-6 h-10 w-10 text-brand-500" aria-hidden="true" />
            <blockquote className="relative text-xl font-extrabold leading-snug text-stone-950 sm:text-2xl">
              “Mỗi trận bóng rổ không chỉ là những pha ghi điểm, mà là nơi tinh thần đồng đội và niềm đam mê được khẳng định.”
            </blockquote>
            <figcaption className="relative mt-6 text-xs font-bold uppercase tracking-widest text-brand-700">
              GoldenState Basketball Club · 2026
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center" data-reveal>
            <span className="eyebrow">Lý do lựa chọn</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">Vì sao nên chọn GoldenState?</h2>
            <p className="mt-3 text-base text-stone-600">Trải nghiệm dịch vụ đặt sân bóng rổ hiện đại, bảo mật và tiện lợi nhất.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card hover-lift group p-8 hover:border-brand-200" data-reveal style={{ "--reveal-index": i } as React.CSSProperties}>
                  <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-200 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-extrabold text-stone-950">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600">{f.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-3xl border border-stone-200 bg-surface p-8 text-center sm:flex-row sm:text-left" data-reveal>
            <div>
              <h3 className="text-xl font-extrabold text-stone-950">Sẵn sàng cho trận đấu tiếp theo?</h3>
              <p className="mt-1 text-sm text-stone-600">Hàng nghìn khung giờ trống đang chờ đội của bạn.</p>
            </div>
            <Link to="/fields" className="btn-primary min-h-12 shrink-0 rounded-xl px-7 text-sm">
              Đặt sân ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
