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
    <div className="bg-[#f7f8f6] text-slate-700 min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-amber-700">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2 font-black text-slate-950 text-base">
              <FileText className="h-5 w-5 text-amber-600" /> Mục lục điều khoản
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
                <Sparkles className="w-4 h-4" /> Quy chế thành viên
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Điều Khoản Sử Dụng</h1>
              <p className="mt-2 text-xs text-slate-500">Cập nhật lần cuối: 12 tháng 09, 2026</p>
            </div>

            <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600">
              <section id="overview">
                <h2 className="text-xl font-bold text-slate-950 mb-3">1. Tổng quan</h2>
                <p>Chào mừng bạn đến với Golden State, nền tảng hỗ trợ tìm kiếm và đặt sân bóng rổ trực tuyến. Khi truy cập hoặc sử dụng dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý với các điều khoản dưới đây.</p>
                <p className="mt-2">Golden State có thể cập nhật điều khoản để phù hợp với hoạt động kinh doanh và quy định pháp luật. Những thay đổi quan trọng sẽ được thông báo minh bạch trên hệ thống.</p>
              </section>

              <section id="account">
                <h2 className="text-xl font-bold text-slate-950 mb-3">2. Tài khoản thành viên</h2>
                <p>Bạn chịu trách nhiệm cung cấp thông tin chính xác khi đăng ký và bảo mật tài khoản, mật khẩu của mình. Mỗi tài khoản chỉ dành cho một người sử dụng, trừ khi có thỏa thuận khác.</p>
                <ul className="list-disc space-y-2 pl-5 mt-2 text-slate-500">
                  <li>Không sử dụng tài khoản để giả mạo, lừa đảo hoặc thực hiện hành vi trái pháp luật.</li>
                  <li>Thông báo ngay cho ban quản lý nếu phát hiện truy cập trái phép.</li>
                  <li>Golden State có quyền tạm khóa tài khoản nếu có dấu hiệu gian lận hoặc vi phạm nội quy sân.</li>
                </ul>
              </section>

              <section id="booking">
                <h2 className="text-xl font-bold text-slate-950 mb-3">3. Đặt sân và thanh toán</h2>
                <p>Thông tin sân, khung giờ và giá được hiển thị trên hệ thống theo thời gian thực. Đơn đặt sân chỉ được xác nhận khi hệ thống ghi nhận thành công và khoản thanh toán cọc/toàn phần đã được xử lý.</p>
                <p className="mt-2">Thanh toán trực tuyến được bảo mật qua các cổng uy tín như VNPay và VietQR. Bạn vui lòng kiểm tra kỹ số tiền, tên sân và thời gian thi đấu trước khi hoàn tất giao dịch.</p>
              </section>

              <section id="cancel">
                <h2 className="text-xl font-bold text-slate-950 mb-3">4. Hủy sân và hoàn tiền</h2>
                <p>Chính sách hoàn hủy áp dụng nguyên tắc minh bạch: Hoàn 100% tiền cọc nếu thực hiện yêu cầu hủy hợp lệ trước 2 giờ so với giờ thi đấu.</p>
                <ul className="list-disc space-y-2 pl-5 mt-2 text-slate-500">
                  <li>Yêu cầu hủy phải được thao tác trực tiếp trên mục "Đơn của tôi".</li>
                  <li>Tiền hoàn sẽ được chuyển về tài khoản ngân hàng do bạn cung cấp trong vòng 24 giờ làm việc.</li>
                </ul>
              </section>

              <section id="responsibility">
                <h2 className="text-xl font-bold text-slate-950 mb-3">5. Quyền và trách nhiệm</h2>
                <p>Người chơi có quyền tiếp cận thông tin dịch vụ chính xác, sử dụng đúng sân bóng rổ đã đặt. Người chơi có nghĩa vụ tuân thủ nội quy an toàn của sân và giữ gìn vệ sinh chung.</p>
              </section>
            </div>

            <div className="mt-10 flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-600" />
              Bạn cần giải thích thêm? Vui lòng liên hệ <Link to="/contact" className="font-bold underline ml-1">Bộ phận hỗ trợ 24/7</Link>.
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
