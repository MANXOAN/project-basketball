import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, Sparkles } from "lucide-react";

const sections = [
  ["overview", "1. Tổng quan"],
  ["account", "2. Tài khoản thành viên"],
  ["booking", "3. Đặt sân và thanh toán"],
  ["cancel", "4. Hủy sân và hoàn tiền"],
  ["responsibility", "5. Quyền và trách nhiệm"],
];

export default function Terms() {
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
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Quy chế thành viên
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-stone-950 sm:text-5xl">Điều khoản sử dụng</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">Quy định sử dụng nền tảng đặt sân GoldenState dành cho người chơi và thành viên.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">Cập nhật lần cuối: 12 tháng 09, 2026</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="card p-5 lg:sticky lg:top-28">
            <div className="mb-3 flex items-center gap-2 px-2 text-base font-extrabold text-stone-950">
              <FileText className="h-5 w-5 text-brand-600" aria-hidden="true" /> Mục lục điều khoản
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
              <section id="overview" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">1. Tổng quan</h2>
                <p>Chào mừng bạn đến với Golden State, nền tảng hỗ trợ tìm kiếm và đặt sân bóng rổ trực tuyến. Khi truy cập hoặc sử dụng dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý với các điều khoản dưới đây.</p>
                <p className="mt-3">Golden State có thể cập nhật điều khoản để phù hợp với hoạt động kinh doanh và quy định pháp luật. Những thay đổi quan trọng sẽ được thông báo minh bạch trên hệ thống.</p>
              </section>

              <section id="account" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">2. Tài khoản thành viên</h2>
                <p>Bạn chịu trách nhiệm cung cấp thông tin chính xác khi đăng ký và bảo mật tài khoản, mật khẩu của mình. Mỗi tài khoản chỉ dành cho một người sử dụng, trừ khi có thỏa thuận khác.</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-500">
                  <li>Không sử dụng tài khoản để giả mạo, lừa đảo hoặc thực hiện hành vi trái pháp luật.</li>
                  <li>Thông báo ngay cho ban quản lý nếu phát hiện truy cập trái phép.</li>
                  <li>Golden State có quyền tạm khóa tài khoản nếu có dấu hiệu gian lận hoặc vi phạm nội quy sân.</li>
                </ul>
              </section>

              <section id="booking" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">3. Đặt sân và thanh toán</h2>
                <p>Thông tin sân, khung giờ và giá được hiển thị trên hệ thống theo thời gian thực. Đơn đặt sân chỉ được xác nhận khi hệ thống ghi nhận thành công và khoản thanh toán cọc/toàn phần đã được xử lý.</p>
                <p className="mt-3">Thanh toán trực tuyến được bảo mật qua các cổng uy tín như VNPay và VietQR. Bạn vui lòng kiểm tra kỹ số tiền, tên sân và thời gian thi đấu trước khi hoàn tất giao dịch.</p>
              </section>

              <section id="cancel" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">4. Hủy sân và hoàn tiền</h2>
                <p>Chính sách hoàn hủy áp dụng nguyên tắc minh bạch: Hoàn 100% tiền cọc nếu thực hiện yêu cầu hủy hợp lệ trước 2 giờ so với giờ thi đấu.</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-500">
                  <li>Yêu cầu hủy phải được thao tác trực tiếp trên mục "Đơn của tôi".</li>
                  <li>Tiền hoàn sẽ được chuyển về tài khoản ngân hàng do bạn cung cấp trong vòng 24 giờ làm việc.</li>
                </ul>
              </section>

              <section id="responsibility" className="scroll-mt-28" data-reveal>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-stone-950">5. Quyền và trách nhiệm</h2>
                <p>Người chơi có quyền tiếp cận thông tin dịch vụ chính xác, sử dụng đúng sân bóng rổ đã đặt. Người chơi có nghĩa vụ tuân thủ nội quy an toàn của sân và giữ gìn vệ sinh chung.</p>
              </section>
            </div>

            <div className="mt-12 flex max-w-[65ch] items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              <p>Bạn cần giải thích thêm? Vui lòng liên hệ <Link to="/contact" className="font-bold text-brand-800 underline underline-offset-2 hover:text-brand-950">Bộ phận hỗ trợ 24/7</Link>.</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
