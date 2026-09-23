import { Form, Input, Button } from "antd";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    if (!token) {
      toast.error("Liên kết đặt lại mật khẩu không hợp lệ");
      return;
    }
    if (values.password !== values.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      const response = await api.post<{ message: string }>("/reset-password", {
        token,
        newPassword: values.password,
      });
      toast.success(response.data.message || "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Liên kết đã hết hạn hoặc không hợp lệ");
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
          <LockKeyhole className="h-8 w-8" />
        </div>
        
        <h1 className="text-center text-2xl font-black text-white">Đặt Lại Mật Khẩu</h1>
        <p className="mb-8 mt-2 text-center text-gray-400 text-xs leading-relaxed">
          Tạo mật khẩu bảo mật mới cho tài khoản của bạn.
        </p>

        {!token ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-center text-xs font-bold text-rose-400">
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã bị thiếu token.
          </div>
        ) : (
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Nhập mật khẩu mới"
                className="!bg-black !border-white/10 !text-white !rounded-xl hover:!border-yellow-500 focus:!border-yellow-500 !h-12"
              />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue("password") === value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Xác nhận mật khẩu mới"
                className="!bg-black !border-white/10 !text-white !rounded-xl hover:!border-yellow-500 focus:!border-yellow-500 !h-12"
              />
            </Form.Item>
            
            <Button
              htmlType="submit"
              block
              size="large"
              className="!h-12 !rounded-xl !bg-yellow-500 !text-black hover:!bg-yellow-400 !font-extrabold !border-none !shadow-lg !shadow-yellow-500/20"
            >
              Lưu mật khẩu mới
            </Button>
          </Form>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          <Link to="/forgot-password" className="font-bold text-yellow-400 hover:underline">
            Gửi lại yêu cầu khác
          </Link>
        </p>
      </div>
    </div>
  );
}
