import { useState } from "react";
import { Form, Input, Button } from "antd";
import { ArrowLeft, KeyRound, Mail, ShieldCheck, Timer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { AuthShell, AuthCardHeader } from "./Login";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setSubmitting(true);
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
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Khôi phục tài khoản"
      headline="Quên mật khẩu?"
      accent="Đừng lo lắng"
      description="Chỉ cần email đã đăng ký, bạn sẽ nhận liên kết đặt lại mật khẩu và quay lại sân ngay."
      highlights={[
        { icon: Mail, text: "Nhận liên kết qua email đăng ký" },
        { icon: ShieldCheck, text: "Liên kết bảo mật, dùng một lần" },
        { icon: Timer, text: "Hoàn tất chỉ trong vài phút" },
      ]}
    >
      <div className="card p-6 sm:p-8">
        <Link to="/login" className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-stone-600 transition-colors hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại đăng nhập
        </Link>

        <AuthCardHeader icon={KeyRound} title="Quên mật khẩu" description="Nhập địa chỉ email đăng ký để nhận liên kết đặt lại mật khẩu mới." />

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label={<span className="text-sm font-semibold text-stone-700">Email</span>}
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              size="large"
              prefix={<Mail className="mr-1 h-4 w-4 text-stone-400" aria-hidden="true" />}
              placeholder="ban@email.com"
              autoComplete="email"
              className="!h-12 !rounded-xl"
            />
          </Form.Item>

          <Button htmlType="submit" type="primary" block size="large" loading={submitting} className="btn-primary !h-12 !rounded-xl !border-none !text-base !font-bold">
            {submitting ? "Đang gửi yêu cầu…" : "Gửi yêu cầu đặt lại mật khẩu"}
          </Button>
        </Form>

        <div className="mt-7 border-t border-stone-100 pt-6 text-center text-sm text-stone-600">
          Đã nhớ lại mật khẩu?{" "}
          <Link to="/login" className="font-bold text-brand-700 hover:text-brand-800 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
