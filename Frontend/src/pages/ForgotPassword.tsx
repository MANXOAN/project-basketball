import { Form, Input, Button } from "antd";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const onFinish = async (values: { email: string }) => {
    try {
      const response = await api.post<{ message: string; resetToken?: string }>(
        "/forgot-password",
        { email: values.email.trim() }
      );
      const token = response.data.resetToken;
      toast.success(response.data.message || "Yêu cầu đặt lại mật khẩu đã được ghi nhận");
      if (token) {
        navigate(`/reset-password?token=${encodeURIComponent(token)}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-12 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[460px] rounded-3xl bg-zinc-900 border border-white/10 p-8 shadow-2xl sm:p-10 relative z-10">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-yellow-400 transition-colors uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
        </Link>
        
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 shadow-lg shadow-yellow-500/10 mb-4">
          <KeyRound className="h-8 w-8" />
        </div>
        
        <h1 className="text-center text-2xl font-black text-white">Quên Mật Khẩu?</h1>
        <p className="mb-8 mt-2 text-center text-gray-400 text-xs leading-relaxed">
          Nhập địa chỉ email đăng ký để nhận liên kết xác thực đặt lại mật khẩu mới.
        </p>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              size="large"
              prefix={<Mail className="text-gray-500 mr-2 h-4 w-4" />}
              placeholder="Nhập email của bạn"
              className="!bg-black !border-white/10 !text-white !rounded-xl hover:!border-yellow-500 focus:!border-yellow-500 !h-12"
            />
          </Form.Item>
          
          <Button
            htmlType="submit"
            block
            size="large"
            className="!h-12 !rounded-xl !bg-yellow-500 !text-black hover:!bg-yellow-400 !font-extrabold !border-none !shadow-lg !shadow-yellow-500/20"
          >
            Gửi yêu cầu đặt lại mật khẩu
          </Button>
        </Form>

        <p className="mt-8 text-center text-xs text-gray-400">
          Đã nhớ lại mật khẩu?{" "}
          <Link to="/login" className="font-bold text-yellow-400 hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
