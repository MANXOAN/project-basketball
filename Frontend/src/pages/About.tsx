import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
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

export default function About() {
  return (
    <div className="bg-black text-gray-200 min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-[500px] flex items-center px-4 py-24 sm:px-6 lg:px-8 border-b border-white/5"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(11,11,11,0.95) 100%), url(${banner2})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative mx-auto max-w-7xl w-full">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-yellow-400 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" /> Đam mê bùng nổ trên từng đường bóng
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl text-white">
              Golden State kết nối bạn với sàn đấu đỉnh cao.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Nền tảng đặt sân bóng rổ chuyên nghiệp, giúp các đội bóng tìm kiếm, đặt lịch và ra sân nhanh nhất.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/fields" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm">
                Tìm sân bóng ngay <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#mission" className="btn-outline inline-flex items-center px-6 py-3.5 rounded-xl text-sm">
                Khám phá sứ mệnh
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="mission" className="relative mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8 z-20">
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl sm:grid-cols-3">
          <div className="border-b border-white/5 pb-5 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6 text-center sm:text-left">
            <p className="text-4xl font-black text-yellow-400">2,400+</p>
            <p className="mt-2 text-sm font-semibold text-gray-400">Sân bóng rổ toàn quốc</p>
          </div>
          <div className="border-b border-white/5 pb-5 sm:border-b-0 sm:border-r sm:pb-0 sm:px-6 text-center sm:text-left">
            <p className="text-4xl font-black text-yellow-400">150K+</p>
            <p className="mt-2 text-sm font-semibold text-gray-400">Người chơi đặt sân thường xuyên</p>
          </div>
          <div className="sm:pl-6 text-center sm:text-left">
            <p className="text-4xl font-black text-yellow-400">24/7</p>
            <p className="mt-2 text-sm font-semibold text-gray-400">Hỗ trợ check-in và hoàn hủy tức thì</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-500">
              <Trophy className="w-4 h-4" /> Sứ mệnh của chúng tôi
            </div>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl text-white">
              Nâng tầm trải nghiệm bóng rổ cộng đồng.
            </h2>
            <p className="mt-5 leading-relaxed text-gray-400 text-sm md:text-base">
              Golden State xuất phát từ niềm đam mê bóng rổ và khao khát loại bỏ mọi phiền toái khi tìm sân: không còn phải gọi điện dò hỏi lịch trống, không sợ bị trùng giờ thi đấu, thanh toán cọc minh bạch và hoàn tiền công bằng.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-3 text-sm font-semibold text-gray-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                  {reason}
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 text-white shadow-2xl sm:p-12">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl text-yellow-400 mb-6">
              🏀
            </div>
            <p className="text-xl sm:text-2xl font-black leading-snug">
              “Mỗi trận bóng rổ không chỉ là những pha ghi điểm, mà là nơi tinh thần đồng đội và niềm đam mê được khẳng định.”
            </p>
            <p className="mt-6 text-xs uppercase font-bold tracking-widest text-yellow-400">
              GoldenState Basketball Club · 2026
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-zinc-950 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white mb-4">Vì Sao Nên Chọn GoldenState?</h2>
            <p className="text-gray-400 text-sm">Trải nghiệm dịch vụ đặt sân bóng rổ hiện đại, bảo mật và tiện lợi nhất.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-zinc-900 border border-white/5 rounded-3xl p-8 hover:border-yellow-500/30 transition-colors group">
                  <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-yellow-400 mb-6 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
