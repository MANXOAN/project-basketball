import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
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

  return (
    <div className="bg-black text-gray-200 min-h-screen">
      {/* Header Banner */}
      <section className="bg-zinc-950 border-b border-white/5 px-4 py-20 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-yellow-400">
              <MessageSquare className="h-4 w-4" /> Luôn sẵn sàng hỗ trợ bạn
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Liên Hệ Golden State
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
              Bạn cần hỗ trợ đặt sân, hợp tác nhượng quyền sân bóng hay có câu hỏi cần giải đáp? Hãy gửi tin nhắn cho chúng tôi.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
        {/* Contact Info Card */}
        <section className="rounded-3xl bg-zinc-900 border border-white/10 p-8 text-white shadow-2xl relative overflow-hidden h-fit">
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">Kênh kết nối trực tiếp</p>
          <h2 className="mt-2 text-2xl font-black">Thông Tin Liên Lạc</h2>
          <p className="mt-2 text-xs text-gray-400 leading-relaxed">
            Đội ngũ CSKH và kỹ thuật viên túc trực liên tục để đảm bảo trận đấu của bạn diễn ra thuận lợi.
          </p>

          <div className="mt-8 space-y-6">
            {contactDetails.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black border border-white/10 text-yellow-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs leading-relaxed text-yellow-300">
            ⚡ Chúng tôi cam kết phản hồi các yêu cầu đặt sân và hỗ trợ kỹ thuật trong vòng 15 phút làm việc.
          </div>
        </section>

        {/* Message Form */}
        <section className="rounded-3xl border border-white/5 bg-zinc-900 p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">Gửi lời nhắn</p>
            <h2 className="mt-1 text-2xl font-black text-white">Bạn đang cần chúng tôi hỗ trợ điều gì?</h2>
          </div>

          {sent ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl bg-black border border-white/5 p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-yellow-400 mb-4" />
              <h3 className="text-2xl font-extrabold text-white">Cảm ơn bạn đã liên hệ!</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-400 leading-relaxed">
                Tin nhắn của bạn đã được chuyển tới bộ phận chăm sóc khách hàng của GoldenState. Chúng tôi sẽ phản hồi sớm nhất!
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 btn-outline px-6 py-2.5 rounded-xl text-xs font-bold"
              >
                Gửi lời nhắn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Họ và tên *</label>
                  <input
                    required
                    name="name"
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email liên hệ *</label>
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số điện thoại *</label>
                <input
                  required
                  type="tel"
                  name="phone"
                  placeholder="081 22 88 111"
                  className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nội dung chi tiết *</label>
                <textarea
                  required
                  name="message"
                  rows={5}
                  placeholder="Hãy chia sẻ thông tin về yêu cầu hỗ trợ, thắc mắc lịch đặt sân hoặc hợp tác..."
                  className="w-full resize-none rounded-xl bg-black border border-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500"
                />
              </div>

              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold"
              >
                <Send className="h-4 w-4" /> Gửi tin nhắn ngay
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
