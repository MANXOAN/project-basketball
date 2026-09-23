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
    <div className="bg-[#f7f8f6] text-slate-700 min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-amber-700">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2 font-black text-slate-950 text-base">
              <LockKeyhole className="h-5 w-5 text-amber-600" /> Mục lục chính sách
            </div>
            <nav className="space-y-1.5">
              {sections.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 font-medium">
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="border-b border-slate-100 pb-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">
                <Sparkles className="w-4 h-4" /> An toàn thông tin
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Chính Sách Bảo Mật</h1>
              <p className="mt-2 text-xs text-slate-500">Cập nhật lần cuối: 12 tháng 09, 2026</p>
            </div>

            <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600">
              <section id="collect">
                <h2 className="text-xl font-bold text-slate-950 mb-3">1. Thông tin chúng tôi thu thập</h2>
                <p>Golden State thu thập thông tin cần thiết để cung cấp dịch vụ đặt sân, bao gồm họ tên, email, số điện thoại, thông tin đơn đặt sân và dữ liệu giao dịch.</p>
                <p className="mt-2">Khi bạn sử dụng website, một số dữ liệu kỹ thuật như loại thiết bị, trình duyệt và nhật ký truy cập có thể được ghi nhận nhằm cải thiện hiệu năng và an toàn hệ thống.</p>
              </section>

              <section id="use">
                <h2 className="text-xl font-bold text-slate-950 mb-3">2. Mục đích sử dụng dữ liệu</h2>
                <ul className="list-disc space-y-2 pl-5 text-slate-500">
                  <li>Xác nhận, quản lý và hỗ trợ các đơn đặt sân bóng.</li>
                  <li>Gửi thông báo nhắc lịch thi đấu tự động qua SMS/Email.</li>
                  <li>Cải thiện chất lượng dịch vụ, ngăn chặn các hành vi đặt giữ chỗ ảo.</li>
                  <li>Cung cấp quyền lợi voucher ưu đãi cho thành viên thân thiết.</li>
                </ul>
              </section>

              <section id="share">
                <h2 className="text-xl font-bold text-slate-950 mb-3">3. Chia sẻ với đối tác sân</h2>
                <p>Golden State chỉ chia sẻ thông tin cần thiết (tên, SĐT, mã đặt sân) với ban quản lý sân để hỗ trợ check-in. Chúng tôi cam kết tuyệt đối không bán hoặc cung cấp thông tin cho các bên thứ ba vì mục đích quảng cáo rác.</p>
              </section>

              <section id="security">
                <h2 className="text-xl font-bold text-slate-950 mb-3">4. Bảo mật và mã hóa</h2>
                <p>Mọi thông tin mật khẩu được mã hóa an toàn. Các giao dịch tài chính trực tuyến được bảo vệ qua giao thức HTTPS và các cổng thanh toán đạt chuẩn quốc tế PCI-DSS.</p>
              </section>

              <section id="rights">
                <h2 className="text-xl font-bold text-slate-950 mb-3">5. Quyền hạn của thành viên</h2>
                <p>Bạn có toàn quyền truy cập, chỉnh sửa thông tin cá nhân trong mục Hồ sơ hoặc yêu cầu xóa dữ liệu bằng cách liên hệ với chúng tôi qua trang Liên hệ.</p>
              </section>
            </div>

            <div className="mt-10 flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
              <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600" />
              GoldenState cam kết bảo vệ dữ liệu thành viên minh bạch và an toàn tuyệt đối.
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
