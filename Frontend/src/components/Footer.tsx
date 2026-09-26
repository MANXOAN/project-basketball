import { Link } from "react-router-dom";
import { ArrowRight, Phone, Mail, MapPin, Camera, PlayCircle, CalendarCheck, ShieldCheck, Clock, Trophy } from "lucide-react";
import BrandLogo from "./BrandLogo";

const LINK_GROUPS = [
  {
    title: "Khám phá",
    links: [
      { to: "/fields", label: "Tìm sân bóng" },
      { to: "/map", label: "Bản đồ sân bãi" },
      { to: "/clubs", label: "Câu lạc bộ" },
      { to: "/tournaments", label: "Giải đấu" },
      { to: "/rankings", label: "Bảng xếp hạng" },
      { to: "/blog", label: "Tin tức bóng rổ" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { to: "/contact", label: "Liên hệ hỗ trợ" },
      { to: "/my-bookings", label: "Tra cứu đơn đặt" },
      { to: "/terms", label: "Quy chế hoạt động" },
      { to: "/privacy", label: "Chính sách bảo mật" },
      { to: "/about", label: "Về chúng tôi" },
    ],
  },
];

const PROMISES = [
  { icon: CalendarCheck, title: "Giữ chỗ < 60 giây", text: "Chọn giờ, xác nhận, nhận vé QR ngay." },
  { icon: ShieldCheck, title: "Thanh toán an toàn", text: "VNPay, VietQR hoặc tiền mặt tại sân." },
  { icon: Clock, title: "Hủy linh hoạt", text: "Hoàn 100% khi hủy trước 2 giờ." },
  { icon: Trophy, title: "Cộng đồng sôi động", text: "Câu lạc bộ, giải đấu, bảng xếp hạng." },
];

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-stone-200 bg-white text-sm text-stone-600">
      <div className="mx-auto max-w-7xl px-4">
        <div data-reveal className="relative -mt-px grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-stone-900">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-stone-500">{text}</span>
              </span>
            </div>
          ))}
        </div>

        <div data-reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-6 py-8 text-white shadow-[0_24px_48px_-24px_rgb(207_74_12/0.7)] sm:px-10 md:flex md:items-center md:justify-between md:gap-8">
          <div className="brand-grid pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgb(255_255_255/0.35)_1px,transparent_1px)]" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Sẵn sàng ra sân tối nay?</h2>
            <p className="mt-2 max-w-xl text-white/85">Hơn 10 sân bóng rổ đang mở lịch. Đặt ngay để giữ khung giờ đẹp nhất.</p>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3 md:mt-0">
            <Link to="/fields" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-bold text-brand-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              Đặt sân ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="tel:0812288111" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/40 px-5 font-bold text-white transition hover:bg-white/10">
              <Phone className="h-4 w-4" aria-hidden="true" /> 081 22 88 111
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <BrandLogo subtitle="Basketball Club" />
            <p className="mt-5 max-w-sm leading-relaxed text-stone-500">
              Nền tảng đặt sân bóng rổ dành cho cộng đồng Việt Nam — tìm sân, xem lịch trống và thanh toán trong vài bước.
            </p>
            <div className="mt-6 flex gap-2">
              {[
                { label: "Facebook", icon: <span aria-hidden="true" className="text-sm font-black">f</span> },
                { label: "Instagram", icon: <Camera className="h-4 w-4" aria-hidden="true" /> },
                { label: "YouTube", icon: <PlayCircle className="h-4 w-4" aria-hidden="true" /> },
                { label: "Zalo", icon: <span aria-hidden="true" className="text-xs font-black">Zalo</span> },
              ].map((social) => (
                <a key={social.label} href="#" onClick={(event) => event.preventDefault()} aria-label={social.label} title={social.label} className="grid h-10 min-w-10 place-items-center rounded-xl border border-stone-200 px-2 text-stone-600 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title} className="md:col-span-2">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-stone-900">{group.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} className="inline-flex items-center gap-1 text-stone-500 transition hover:translate-x-0.5 hover:text-brand-700">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="md:col-span-4">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-stone-900">Nhận ưu đãi thành viên</h3>
            <p className="mt-4 text-stone-500">Voucher <strong className="text-brand-700">giảm 20%</strong> cho lần đặt sân đầu tiên và tin giải đấu mới nhất.</p>
            <form className="mt-4 flex rounded-xl border border-stone-200 bg-white p-1 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="footer-email" className="sr-only">Email của bạn</label>
              <input id="footer-email" type="email" placeholder="email@cua-ban.vn" className="min-w-0 flex-1 bg-transparent px-3 text-stone-900 outline-none placeholder:text-stone-400" />
              <button type="submit" className="btn-primary rounded-lg px-4 py-2.5 text-xs">Đăng ký</button>
            </form>
            <ul className="mt-5 space-y-2 text-stone-500">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-500" aria-hidden="true" /> hotro@goldenstate.vn</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" /> Trịnh Văn Bô, Nam Từ Liêm, Hà Nội</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-stone-100 py-6 text-xs text-stone-500 md:flex-row">
          <p>© 2026 <span className="font-semibold text-stone-700">GoldenState Basketball</span>. Bản quyền thuộc về CLB.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-brand-700">Điều khoản</Link>
            <Link to="/privacy" className="hover:text-brand-700">Bảo mật</Link>
            <Link to="/contact" className="hover:text-brand-700">Hợp tác nhượng quyền</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
