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
    <div className="bg-black text-gray-200 min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-yellow-400">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="rounded-3xl border border-white/5 bg-zinc-900 p-6 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2 font-black text-white text-base">
              <LockKeyhole className="h-5 w-5 text-yellow-400" /> Mục lục chính sách
            </div>
            <nav className="space-y-1.5">
              {sections.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block rounded-xl px-3 py-2 text-sm text-gray-400 transition hover:bg-black hover:text-yellow-400 font-medium">
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="rounded-3xl border border-white/5 bg-zinc-900 p-8 sm:p-12">
            <div className="border-b border-white/10 pb-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2">
                <Sparkles className="w-4 h-4" /> An toàn thông tin
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Chính Sách Bảo Mật</h1>
              <p className="mt-2 text-xs text-gray-400">Cập nhật lần cuối: 12 tháng 09, 2026</p>
            </div>

            <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-300">
              <section id="collect">
                <h2 className="text-xl font-bold text-white mb-3">1. Thông tin chúng tôi thu thập</h2>
                <p>Golden State thu thập thông tin cần thiết để cung cấp dịch vụ đặt sân, bao gồm họ tên, email, số điện thoại, thông tin đơn đặt sân và dữ liệu giao dịch.</p>
                <p className="mt-2">Khi bạn sử dụng website, một số dữ liệu kỹ thuật như loại thiết bị, trình duyệt và nhật ký truy cập có thể được ghi nhận nhằm cải thiện hiệu năng và an toàn hệ thống.</p>
              </section>

              <section id="use">
                <h2 className="text-xl font-bold text-white mb-3">2. Mục đích sử dụng dữ liệu</h2>
                <ul className="list-disc space-y-2 pl-5 text-gray-400">
                  <li>Xác nhận, quản lý và hỗ trợ các đơn đặt sân bóng.</li>
                  <li>Gửi thông báo nhắc lịch thi đấu tự động qua SMS/Email.</li>
                  <li>Cải thiện chất lượng dịch vụ, ngăn chặn các hành vi đặt giữ chỗ ảo.</li>
                  <li>Cung cấp quyền lợi voucher ưu đãi cho thành viên thân thiết.</li>
                </ul>
              </section>

              <section id="share">
                <h2 className="text-xl font-bold text-white mb-3">3. Chia sẻ với đối tác sân</h2>
                <p>Golden State chỉ chia sẻ thông tin cần thiết (tên, SĐT, mã đặt sân) với ban quản lý sân để hỗ trợ check-in. Chúng tôi cam kết tuyệt đối không bán hoặc cung cấp thông tin cho các bên thứ ba vì mục đích quảng cáo rác.</p>
              </section>

              <section id="security">
                <h2 className="text-xl font-bold text-white mb-3">4. Bảo mật và mã hóa</h2>
                <p>Mọi thông tin mật khẩu được mã hóa an toàn. Các giao dịch tài chính trực tuyến được bảo vệ qua giao thức HTTPS và các cổng thanh toán đạt chuẩn quốc tế PCI-DSS.</p>
              </section>

              <section id="rights">
                <h2 className="text-xl font-bold text-white mb-3">5. Quyền hạn của thành viên</h2>
                <p>Bạn có toàn quyền truy cập, chỉnh sửa thông tin cá nhân trong mục Hồ sơ hoặc yêu cầu xóa dữ liệu bằng cách liên hệ với chúng tôi qua trang Liên hệ.</p>
              </section>
            </div>

            <div className="mt-10 flex items-center gap-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-xs text-yellow-300">
              <ShieldCheck className="h-5 w-5 shrink-0 text-yellow-400" />
              GoldenState cam kết bảo vệ dữ liệu thành viên minh bạch và an toàn tuyệt đối.
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
