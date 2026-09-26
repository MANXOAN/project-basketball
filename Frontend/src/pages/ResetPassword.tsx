import { useState } from "react";
import { Form, Input, Button } from "antd";
import { AlertCircle, ArrowLeft, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { AuthShell, AuthCardHeader } from "./Login";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { password: string; confirmPassword: string }) => {
    if (!token) {
      toast.error("Liên kết đặt lại mật khẩu không hợp lệ");
      return;
    }
    if (values.password !== values.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ message: string }>("/reset-password", {
        token,
        newPassword: values.password,
      });
      toast.success(response.data.message || "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Liên kết đã hết hạn hoặc không hợp lệ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Bảo mật tài khoản"
      headline="Đặt lại mật khẩu"
      accent="an toàn & nhanh chóng"
      description="Tạo mật khẩu mới đủ mạnh để bảo vệ tài khoản và lịch đặt sân của bạn."
      highlights={[
        { icon: LockKeyhole, text: "Tối thiểu 6 ký tự, nên kết hợp chữ và số" },
        { icon: ShieldCheck, text: "Không dùng lại mật khẩu cũ" },
        { icon: KeyRound, text: "Đăng nhập lại ngay sau khi lưu" },
      ]}
    >
      <div className="card p-6 sm:p-8">
        <Link to="/login" className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-stone-600 transition-colors hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại đăng nhập
        </Link>

        <AuthCardHeader icon={LockKeyhole} title="Đặt lại mật khẩu" description="Tạo mật khẩu bảo mật mới cho tài khoản của bạn." />

        {!token ? (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã bị thiếu token.
          </div>
        ) : (
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="password"
              label={<span className="text-sm font-semibold text-stone-700">Mật khẩu mới</span>}
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Nhập mật khẩu mới"
                autoComplete="new-password"
                className="!h-12 !rounded-xl"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span className="text-sm font-semibold text-stone-700">Xác nhận mật khẩu</span>}
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
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                className="!h-12 !rounded-xl"
              />
            </Form.Item>

            <Button htmlType="submit" type="primary" block size="large" loading={submitting} className="btn-primary !h-12 !rounded-xl !border-none !text-base !font-bold">
              {submitting ? "Đang lưu…" : "Lưu mật khẩu mới"}
            </Button>
          </Form>
        )}

        <div className="mt-7 border-t border-stone-100 pt-6 text-center text-sm">
          <Link to="/forgot-password" className="font-bold text-brand-700 hover:text-brand-800 hover:underline">
            Gửi lại yêu cầu khác
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
