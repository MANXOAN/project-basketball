import { Form, Input, Button } from "antd";
import {
  UserOutlined, MailOutlined, PhoneOutlined, LockOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { api } from "../lib/api";

function Register() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      await api.post("/register", {
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone,
      });
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          error.response?.data ||
          "Đăng ký thất bại. Email có thể đã tồn tại.";
        toast.error(typeof message === "string" ? message : "Đăng ký thất bại");
      } else {
        toast.error("Không thể kết nối server. Hãy chạy npm run db");
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-black">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden bg-[var(--color-primary)] border-r border-white/5">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl" />
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
            Tạo tài khoản<br />
            <span className="text-yellow-400">hoàn toàn miễn phí!</span>
          </h2>
          <p className="text-gray-400 leading-relaxed mb-10">
            Đăng ký trong 1 phút và bắt đầu đặt sân ngay hôm nay. Nhận ngay voucher giảm 20% cho đơn đầu tiên!
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {[
              { icon: "🎁", text: "Voucher 20% cho lần đầu đặt sân" },
              { icon: "📱", text: "Quản lý đơn dễ dàng qua app" },
              { icon: "🔔", text: "Nhắc nhở lịch thi đấu tự động" },
              { icon: "💳", text: "Tích điểm thành viên ưu đãi" },
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
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-50 py-12">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-2xl border border-gray-200">🏀</div>
            <span className="font-extrabold text-xl text-gray-900">
              Golden<span className="text-yellow-500">State</span>
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl">
                🏟️
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900">Đăng ký tài khoản</h1>
              <p className="mt-1.5 text-gray-500 text-sm">
                Tạo tài khoản để đặt sân nhanh hơn và xem lịch sử
              </p>
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="fullName"
                rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined className="text-gray-400" />}
                  placeholder="Họ và tên"
                  className="!rounded-xl"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined className="text-gray-400" />}
                  placeholder="Email"
                  className="!rounded-xl"
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
              >
                <Input
                  size="large"
                  prefix={<PhoneOutlined className="text-gray-400" />}
                  placeholder="Số điện thoại"
                  className="!rounded-xl"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu" },
                  { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Mật khẩu"
                  className="!rounded-xl"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Vui lòng xác nhận mật khẩu" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Xác nhận mật khẩu"
                  className="!rounded-xl"
                />
              </Form.Item>

              <Button
                htmlType="submit"
                type="primary"
                block
                size="large"
                className="!h-12 !rounded-xl !font-bold !text-base"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none" }}
              >
                Tạo tài khoản miễn phí 🎉
              </Button>
            </Form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-extrabold text-blue-600 hover:text-blue-700">
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Bằng cách đăng ký, bạn đồng ý với{" "}
            <Link to="/terms" className="underline">Điều khoản</Link> và{" "}
            <Link to="/privacy" className="underline">Chính sách bảo mật</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
