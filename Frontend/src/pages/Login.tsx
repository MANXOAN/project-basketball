import { Form, Input, Button } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";

function Login() {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      const res = await api.post("/login", {
        email: values.email,
        password: values.password,
      });
      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Đăng nhập thành công!");
      navigate("/");
    } catch (error) {
      toast.error("Sai email hoặc mật khẩu!");
    }
  };

  return (
    <div className="min-h-screen flex bg-black">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-[var(--color-primary)] border-r border-white/5">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-3xl border border-white/10">
              🏀
            </div>
            <div>
              <div className="text-white font-extrabold text-2xl">
                Golden<span className="text-yellow-400">State</span>
              </div>
              <div className="text-gray-400 text-xs tracking-widest uppercase">Basketball Booking</div>
            </div>
          </Link>

          <h2 className="text-3xl font-extrabold text-white mb-4 leading-snug">
            Sân chơi đẳng cấp<br />
            <span className="text-yellow-400">dành cho bạn</span>
          </h2>
          <p className="text-gray-400 leading-relaxed mb-10">
            Hơn 150,000 người chơi đang sử dụng GoldenState để đặt sân mỗi tháng. Tham gia ngay!
          </p>

          <div className="space-y-4">
            {[
              { icon: "⚡", text: "Đặt sân trong 60 giây" },
              { icon: "🛡️", text: "Thanh toán bảo mật, hoàn tiền dễ dàng" },
              { icon: "🗺️", text: "2,400+ sân trên toàn quốc" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-gray-500 text-xs">
          © 2026 GoldenState Basketball · All rights reserved
        </p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-2xl border border-gray-200">🏀</div>
            <span className="font-extrabold text-xl text-gray-900">
              Golden<span className="text-yellow-500">State</span>
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg border border-gray-200">
                🏀
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Đăng nhập</h1>
              <p className="mt-2 text-gray-500 text-sm">
                Đăng nhập để đặt sân nhanh hơn và xem lịch sử
              </p>
            </div>

            <Form layout="vertical" onFinish={onFinish} className="space-y-1">
              <Form.Item
                name="email"
                rules={[{ required: true, message: "Vui lòng nhập email" }]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="Email"
                  className="!rounded-xl"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Mật khẩu"
                  className="!rounded-xl"
                />
              </Form.Item>

              <div className="text-right -mt-2 mb-4">
                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Quên mật khẩu?
                </Link>
              </div>

              <Button
                htmlType="submit"
                type="primary"
                block
                size="large"
                className="!h-12 !rounded-xl !font-bold !text-base"
                style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)", border: "none" }}
              >
                Đăng nhập →
              </Button>
            </Form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="font-extrabold text-blue-600 hover:text-blue-700">
                Đăng ký miễn phí
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <Link to="/terms" className="underline">Điều khoản</Link> và{" "}
            <Link to="/privacy" className="underline">Chính sách bảo mật</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
