import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

const contactDetails = [
  { icon: MapPin, label: "Trụ sở chính", value: "Tầng 3, 21 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh" },
  { icon: Phone, label: "Tổng đài hỗ trợ 24/7", value: "081 22 88 111" },
  { icon: Mail, label: "Email liên hệ", value: "support@goldenstate.vn" },
  { icon: Clock3, label: "Giờ hoạt động sân", value: "Thứ 2 - Chủ nhật · 06:00 - 22:00" },
];

export default function Contact() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    event.currentTarget.reset();
    toast.success("Đã gửi lời nhắn đến Ban quản trị GoldenState!");
  };

  const labelClass = "mb-2 block text-sm font-semibold text-stone-700";

  return (
    <div className="min-h-screen bg-surface text-stone-700">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-white px-4 pb-14 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="brand-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black_20%,transparent_70%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl animate-fade-in-up">
          <div className="max-w-2xl">
            <span className="eyebrow rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Luôn sẵn sàng hỗ trợ bạn
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-stone-950 sm:text-5xl">
              Liên hệ <span className="text-gradient-brand">GoldenState</span>
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-600 sm:text-lg">
              Bạn cần hỗ trợ đặt sân, hợp tác nhượng quyền sân bóng hay có câu hỏi cần giải đáp? Hãy gửi tin nhắn cho chúng tôi.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[.85fr_1.15fr] lg:gap-8 lg:px-8">
        {/* Contact Info Card */}
        <section className="relative h-fit overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-6 text-white shadow-brand sm:p-8" data-reveal>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-400/40 blur-3xl" aria-hidden="true" />
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 text-white/10" fill="none" stroke="currentColor" strokeWidth={1} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3v18" />
            <path d="M5.6 5.6c2.6 2.2 3.9 4.3 3.9 6.4s-1.3 4.2-3.9 6.4M18.4 5.6c-2.6 2.2-3.9 4.3-3.9 6.4s1.3 4.2 3.9 6.4" />
          </svg>

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/85">Kênh kết nối trực tiếp</p>
            <h2 className="mt-2 text-2xl font-extrabold">Thông tin liên lạc</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              Đội ngũ CSKH và kỹ thuật viên túc trực liên tục để đảm bảo trận đấu của bạn diễn ra thuận lợi.
            </p>

            <ul className="mt-8 space-y-3">
              {contactDetails.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-start gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">{label}</p>
                    <p className="mt-0.5 break-words text-sm font-semibold text-white">{value}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white p-4 text-sm leading-relaxed text-stone-700">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              Chúng tôi cam kết phản hồi các yêu cầu đặt sân và hỗ trợ kỹ thuật trong vòng 15 phút làm việc.
            </div>
          </div>
        </section>

        {/* Message Form */}
        <section className="card p-6 sm:p-8" data-reveal style={{ "--reveal-index": 1 } as React.CSSProperties}>
          <div className="mb-8">
            <span className="eyebrow">Gửi lời nhắn</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-stone-950">Bạn đang cần chúng tôi hỗ trợ điều gì?</h2>
          </div>

          {sent ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center animate-scale-in" role="status">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-600 shadow-soft">
                <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
              </span>
              <h3 className="text-2xl font-extrabold text-stone-950">Cảm ơn bạn đã liên hệ!</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
                Tin nhắn của bạn đã được chuyển tới bộ phận chăm sóc khách hàng của GoldenState. Chúng tôi sẽ phản hồi sớm nhất!
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="btn-outline mt-6 min-h-11 rounded-xl px-6 text-sm"
              >
                Gửi lời nhắn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className={labelClass}>Họ và tên <span className="text-rose-600">*</span></label>
                  <input id="contact-name" required name="name" autoComplete="name" placeholder="Nguyễn Văn A" className="input" />
                </div>
                <div>
                  <label htmlFor="contact-email" className={labelClass}>Email liên hệ <span className="text-rose-600">*</span></label>
                  <input id="contact-email" required type="email" name="email" autoComplete="email" placeholder="you@example.com" className="input" />
                </div>
              </div>

              <div>
                <label htmlFor="contact-phone" className={labelClass}>Số điện thoại <span className="text-rose-600">*</span></label>
                <input id="contact-phone" required type="tel" name="phone" autoComplete="tel" placeholder="081 22 88 111" className="input" />
              </div>

              <div>
                <label htmlFor="contact-message" className={labelClass}>Nội dung chi tiết <span className="text-rose-600">*</span></label>
                <textarea
                  id="contact-message"
                  required
                  name="message"
                  rows={5}
                  placeholder="Hãy chia sẻ thông tin về yêu cầu hỗ trợ, thắc mắc lịch đặt sân hoặc hợp tác..."
                  className="input resize-none py-3 leading-relaxed"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-stone-500">Các trường có dấu <span className="text-rose-600">*</span> là bắt buộc.</p>
                <button type="submit" className="btn-primary min-h-12 rounded-xl px-8 text-sm">
                  <Send className="h-4 w-4" aria-hidden="true" /> Gửi tin nhắn ngay
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
