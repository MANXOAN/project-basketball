import { Link } from "react-router-dom";
import { Phone, Trophy, ShieldCheck, Clock, Users, Camera, PlayCircle, Search, Map, BookOpen, Info, FileText, LockKeyhole, TicketCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="text-gray-400 text-sm bg-black border-t border-white/5 relative z-10">
      {/* Stats bar */}
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "5", label: "Cơ sở đang hoạt động", icon: <Trophy className="w-5 h-5 text-yellow-400" /> },
              { value: "11", label: "Sân sẵn sàng phục vụ", icon: <Users className="w-5 h-5 text-yellow-400" /> },
              { value: "< 60s", label: "Hoàn tất giữ chỗ", icon: <ShieldCheck className="w-5 h-5 text-yellow-400" /> },
              { value: "24/7", label: "Hỗ trợ đặt sân tức thì", icon: <Clock className="w-5 h-5 text-yellow-400" /> },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-5 group">
              <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight text-white">
                  Golden<span className="text-yellow-400">State</span>
                </div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Basketball Club</div>
              </div>
            </Link>
            <p className="text-gray-400 leading-relaxed text-sm mb-6">
              Nền tảng đặt sân bóng rổ chuyên nghiệp dành cho cộng đồng Việt Nam. Giữ chỗ tức thì trong 60 giây.
            </p>
            {/* Social icons */}
            <div className="flex gap-2.5">
              {[
                { label: "Facebook", icon: <span aria-hidden="true">f</span> },
                { label: "Instagram", icon: <Camera className="h-4 w-4" /> },
                { label: "YouTube", icon: <PlayCircle className="h-4 w-4" /> },
                { label: "Zalo", icon: <span aria-hidden="true">Z</span> },
              ].map((s) => (
                <button
                  key={s.label}
                  title={s.label}
                  className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-yellow-500 hover:text-black border border-white/10 flex items-center justify-center text-xs font-bold transition-all text-gray-300"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Khám phá */}
          <div>
            <h3 className="text-white font-bold mb-5 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="w-3 h-0.5 bg-yellow-500 rounded"></span>
              Khám phá
            </h3>
            <ul className="space-y-3">
              {[
                { to: "/fields", label: "Tìm sân bóng", icon: <Search className="h-4 w-4" /> },
                { to: "/map", label: "Bản đồ sân bãi", icon: <Map className="h-4 w-4" /> },
                { to: "/clubs", label: "Câu lạc bộ", icon: <Users className="h-4 w-4" /> },
                { to: "/tournaments", label: "Giải đấu", icon: <Trophy className="h-4 w-4" /> },
                { to: "/rankings", label: "Bảng xếp hạng", icon: <TicketCheck className="h-4 w-4" /> },
                { to: "/blog", label: "Tin tức bóng rổ", icon: <BookOpen className="h-4 w-4" /> },
                { to: "/about", label: "Về chúng tôi", icon: <Info className="h-4 w-4" /> },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="hover:text-yellow-400 transition-colors hover:translate-x-1 inline-flex items-center gap-1.5 duration-200 text-sm"
                  >
                    {item.icon}{item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h3 className="text-white font-bold mb-5 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="w-3 h-0.5 bg-yellow-500 rounded"></span>
              Hỗ trợ
            </h3>
            <ul className="space-y-3">
              {[
                { to: "/contact", label: "Liên hệ hỗ trợ", icon: <Phone className="h-4 w-4" /> },
                { to: "/terms", label: "Quy chế hoạt động", icon: <FileText className="h-4 w-4" /> },
                { to: "/privacy", label: "Chính sách bảo mật", icon: <LockKeyhole className="h-4 w-4" /> },
                { to: "/my-bookings", label: "Tra cứu đơn hàng", icon: <TicketCheck className="h-4 w-4" /> },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="hover:text-yellow-400 transition-colors hover:translate-x-1 inline-flex items-center gap-1.5 duration-200 text-sm"
                  >
                    {item.icon}{item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Hotline */}
          <div>
            <h3 className="text-white font-bold mb-5 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="w-3 h-0.5 bg-yellow-500 rounded"></span>
              Ưu đãi thành viên
            </h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Nhận ngay voucher <span className="text-yellow-400 font-bold">giảm 20%</span> cho lần đặt sân đầu tiên.
            </p>
            <div className="flex mb-6 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 focus-within:border-yellow-500/50 transition-colors">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="bg-transparent border-none outline-none px-4 py-3 flex-1 text-white text-sm placeholder:text-gray-600"
              />
              <button className="btn-primary px-5 py-3 font-bold text-xs whitespace-nowrap">
                Đăng ký
              </button>
            </div>

            <div className="bg-zinc-950 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Hotline 24/7</p>
                <a href="tel:0812288111" className="text-yellow-400 font-black text-lg hover:text-yellow-300 transition-colors">
                  081 22 88 111
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2026 <span className="text-gray-300 font-semibold">GoldenState Basketball</span> – Bản quyền thuộc về CLB.</p>
          <div className="flex items-center gap-4">
            <span>🇻🇳 Việt Nam</span>
            <span>·</span>
            <Link to="/contact" className="hover:text-yellow-400 transition-colors">Hợp tác nhượng quyền sân →</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
