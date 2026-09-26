import { Link } from "react-router-dom";
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

const sections = [
  ["collect", "1. Thông tin chúng tôi thu thập"],
  ["use", "2. Mục đích sử dụng dữ liệu"],
  ["share", "3. Chia sẻ với đối tác sân"],
  ["security", "4. Bảo mật và mã hóa"],
  ["rights", "5. Quyền hạn của thành viên"],
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface text-stone-700">
      <header className="relative overflow-hidden border-b border-stone-200 bg-white px-4 pb-12 pt-8 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
        <div className="brand-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_70%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl animate-fade-in-up">
          <Link to="/" className="mb-6 flex w-fit min-h-11 items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về trang chủ
          </Link>
          <span className="eyebrow">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> An toàn thông tin
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-stone-950 sm:text-5xl">Chính sách bảo mật</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">Cách GoldenState thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">Cập nhật lần cuối: 12 tháng 09, 2026</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="card p-5 lg:sticky lg:top-28">
            <div className="mb-3 flex items-center gap-2 px-2 text-base font-extrabold text-stone-950">
              <LockKeyhole className="h-5 w-5 text-brand-600" aria-hidden="true" /> Mục lục chính sách
            </div>
            <nav className="space-y-1" aria-label="Mục lục">
              {sections.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-600 transition hover:bg-brand-50 hover:text-brand-700">
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="card px-6 py-8 sm:px-12 sm:py-12">

            <div className="max-w-[65ch] space-y-10 text-base leading-[1.8] text-stone-700">
              <section id="collect" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">1. Thông tin chúng tôi thu thập</h2>
                <p>Golden State thu thập thông tin cần thiết để cung cấp dịch vụ đặt sân, bao gồm họ tên, email, số điện thoại, thông tin đơn đặt sân và dữ liệu giao dịch.</p>
                <p className="mt-3">Khi bạn sử dụng website, một số dữ liệu kỹ thuật như loại thiết bị, trình duyệt và nhật ký truy cập có thể được ghi nhận nhằm cải thiện hiệu năng và an toàn hệ thống.</p>
              </section>

              <section id="use" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">2. Mục đích sử dụng dữ liệu</h2>
                <ul className="list-disc space-y-2 pl-5 marker:text-brand-500">
                  <li>Xác nhận, quản lý và hỗ trợ các đơn đặt sân bóng.</li>
                  <li>Gửi thông báo nhắc lịch thi đấu tự động qua SMS/Email.</li>
                  <li>Cải thiện chất lượng dịch vụ, ngăn chặn các hành vi đặt giữ chỗ ảo.</li>
                  <li>Cung cấp quyền lợi voucher ưu đãi cho thành viên thân thiết.</li>
                </ul>
              </section>

              <section id="share" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">3. Chia sẻ với đối tác sân</h2>
                <p>Golden State chỉ chia sẻ thông tin cần thiết (tên, SĐT, mã đặt sân) với ban quản lý sân để hỗ trợ check-in. Chúng tôi cam kết tuyệt đối không bán hoặc cung cấp thông tin cho các bên thứ ba vì mục đích quảng cáo rác.</p>
              </section>

              <section id="security" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">4. Bảo mật và mã hóa</h2>
                <p>Mọi thông tin mật khẩu được mã hóa an toàn. Các giao dịch tài chính trực tuyến được bảo vệ qua giao thức HTTPS và các cổng thanh toán đạt chuẩn quốc tế PCI-DSS.</p>
              </section>

              <section id="rights" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">5. Quyền hạn của thành viên</h2>
                <p>Bạn có toàn quyền truy cập, chỉnh sửa thông tin cá nhân trong mục Hồ sơ hoặc yêu cầu xóa dữ liệu bằng cách liên hệ với chúng tôi qua trang Liên hệ.</p>
              </section>
            </div>

            <div className="mt-12 flex max-w-[65ch] items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
              <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              GoldenState cam kết bảo vệ dữ liệu thành viên minh bạch và an toàn tuyệt đối.
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
