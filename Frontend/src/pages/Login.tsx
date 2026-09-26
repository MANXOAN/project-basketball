import { useState, type ReactNode } from "react";
import { Form, Input, Button } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LogIn, ShieldCheck, Timer, MapPin, type LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth";
import BrandLogo from "../components/BrandLogo";

type Highlight = { icon: LucideIcon; text: string };

/** Hoạ tiết sân bóng rổ (nửa sân) vẽ bằng SVG, dùng làm nền cho panel thương hiệu. */
function CourtMotif() {
  return (
    <svg viewBox="0 0 600 700" className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.11]" fill="none" stroke="currentColor" strokeWidth="3" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="40" y="40" width="520" height="620" rx="8" />
      <line x1="40" y1="350" x2="560" y2="350" />
      <circle cx="300" cy="350" r="80" />
      <circle cx="300" cy="350" r="24" />
      <rect x="210" y="40" width="180" height="190" />
      <circle cx="300" cy="230" r="90" />
      <path d="M90 40v110a210 210 0 0 0 420 0V40" />
      <rect x="210" y="470" width="180" height="190" />
      <path d="M90 660V550a210 210 0 0 1 420 0v110" />
    </svg>
  );
}

/** Khung chung cho các trang xác thực: panel cam thương hiệu + thẻ biểu mẫu trên nền trắng. */
export function AuthShell({
  eyebrow,
  headline,
  accent,
  description,
  highlights,
  children,
}: {
  eyebrow: string;
  headline: string;
  accent: string;
  description: string;
  highlights: Highlight[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-12 text-white lg:flex xl:p-14">
        <CourtMotif />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-400/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-950/30 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3 rounded-xl" aria-label="GoldenState — về trang chủ">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lg">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3v18" />
                <path d="M5.6 5.6c2.6 2.2 3.9 4.3 3.9 6.4s-1.3 4.2-3.9 6.4M18.4 5.6c-2.6 2.2-3.9 4.3-3.9 6.4s1.3 4.2 3.9 6.4" />
              </svg>
            </span>
            <span className="leading-none">
              <span className="block text-xl font-extrabold tracking-tight">GoldenState</span>
              <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">Basketball Booking</span>
            </span>
          </Link>
        </div>

        <div className="relative animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] backdrop-blur">
            {eyebrow}
          </span>
          <h2 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            {headline}
            <br />
            <span className="text-brand-100">{accent}</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/90">{description}</p>

          <ul className="mt-10 space-y-3">
            {highlights.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex animate-slide-in-left items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur-sm"
                style={{ animationDelay: `${150 + i * 90}ms` }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs font-medium text-white/75">© 2026 GoldenState Basketball · All rights reserved</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="brand-grid pointer-events-none absolute inset-x-0 top-0 h-64 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo />
          </div>
          {children}
          <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
            Bằng việc tiếp tục, bạn đồng ý với{" "}
            <Link to="/terms" className="font-semibold text-stone-700 underline underline-offset-2 hover:text-brand-700">Điều khoản</Link> và{" "}
            <Link to="/privacy" className="font-semibold text-stone-700 underline underline-offset-2 hover:text-brand-700">Chính sách bảo mật</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Tiêu đề thẻ biểu mẫu dùng chung. */
export function AuthCardHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="mb-7">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-stone-950">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
    </div>
  );
}

const authInputClass = "!rounded-xl !h-12";
const authSubmitClass = "btn-primary !h-12 !rounded-xl !border-none !text-base !font-bold";

function Login() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    try {
      const res = await api.post("/login", {
        email: values.email,
        password: values.password,
      });
      setAuth(res.data.accessToken, res.data.user);
      toast.success("Đăng nhập thành công!");
      const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo") || "/";
      const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
        ? requestedReturnTo
        : "/";
      // Tài khoản quản trị vào thẳng trang admin; giữ nguyên nếu đang mở một trang admin cụ thể.
      const isStaffAccount = ["admin", "manager"].includes(res.data.user?.role);
      navigate(isStaffAccount && !returnTo.startsWith("/admin") ? "/admin" : returnTo, { replace: true });
    } catch {
      toast.error("Sai email hoặc mật khẩu!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Chào mừng trở lại"
      headline="Sân chơi đẳng cấp"
      accent="dành cho bạn"
      description="Hơn 150.000 người chơi đang dùng GoldenState để đặt sân mỗi tháng. Đăng nhập và ra sân ngay hôm nay."
      highlights={[
        { icon: Timer, text: "Đặt sân chỉ trong 60 giây" },
        { icon: ShieldCheck, text: "Thanh toán bảo mật, hoàn tiền dễ dàng" },
        { icon: MapPin, text: "2.400+ sân trên toàn quốc" },
      ]}
    >
      <div className="card p-6 sm:p-8">
        <AuthCardHeader icon={LogIn} title="Đăng nhập" description="Đăng nhập để đặt sân nhanh hơn và theo dõi lịch sử đặt sân của bạn." />

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label={<span className="text-sm font-semibold text-stone-700">Email</span>}
            rules={[{ required: true, message: "Vui lòng nhập email" }]}
          >
            <Input
              size="large"
              prefix={<MailOutlined className="text-stone-400" />}
              placeholder="ban@email.com"
              autoComplete="email"
              className={authInputClass}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-sm font-semibold text-stone-700">Mật khẩu</span>}
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            className="!mb-3"
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined className="text-stone-400" />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              className={authInputClass}
            />
          </Form.Item>

          <div className="mb-6 flex justify-end">
            <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <Button htmlType="submit" type="primary" block size="large" loading={submitting} className={authSubmitClass}>
            {submitting ? "Đang đăng nhập…" : <span className="inline-flex items-center gap-2">Đăng nhập <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>}
          </Button>
        </Form>

        <div className="mt-7 border-t border-stone-100 pt-6 text-center text-sm text-stone-600">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800 hover:underline">
            Đăng ký miễn phí
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default Login;
