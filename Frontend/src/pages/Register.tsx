import { useState } from "react";
import { Form, Input, Button } from "antd";
import {
  UserOutlined, MailOutlined, PhoneOutlined, LockOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowRight, BadgePercent, BellRing, Gift, Smartphone, UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { AuthShell, AuthCardHeader } from "./Login";

function Register() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Tham gia cộng đồng"
      headline="Tạo tài khoản"
      accent="hoàn toàn miễn phí"
      description="Đăng ký trong 1 phút và bắt đầu đặt sân ngay hôm nay. Nhận ngay voucher giảm 20% cho đơn đầu tiên!"
      highlights={[
        { icon: Gift, text: "Voucher 20% cho lần đầu đặt sân" },
        { icon: Smartphone, text: "Quản lý đơn đặt sân dễ dàng" },
        { icon: BellRing, text: "Nhắc lịch thi đấu tự động" },
        { icon: BadgePercent, text: "Tích điểm thành viên, nhận ưu đãi" },
      ]}
    >
      <div className="card p-6 sm:p-8">
        <AuthCardHeader icon={UserPlus} title="Đăng ký tài khoản" description="Tạo tài khoản để đặt sân nhanh hơn và theo dõi lịch sử của bạn." />

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="fullName"
          label={<span className="text-sm font-semibold text-stone-700">Họ và tên</span>}
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined className="text-stone-400" />}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              className="!h-12 !rounded-xl"
            />
          </Form.Item>

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
              prefix={<MailOutlined className="text-stone-400" />}
              placeholder="ban@email.com"
              autoComplete="email"
              className="!h-12 !rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="phone"
          label={<span className="text-sm font-semibold text-stone-700">Số điện thoại</span>}
            rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
          >
            <Input
              size="large"
              prefix={<PhoneOutlined className="text-stone-400" />}
              placeholder="09xx xxx xxx"
              autoComplete="tel"
              className="!h-12 !rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="password"
          label={<span className="text-sm font-semibold text-stone-700">Mật khẩu</span>}
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined className="text-stone-400" />}
              placeholder="Tối thiểu 6 ký tự"
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
              prefix={<LockOutlined className="text-stone-400" />}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              className="!h-12 !rounded-xl"
            />
          </Form.Item>

          <Button htmlType="submit" type="primary" block size="large" loading={submitting} className="btn-primary !mt-2 !h-12 !rounded-xl !border-none !text-base !font-bold">
          {submitting ? "Đang tạo tài khoản…" : <span className="inline-flex items-center gap-2">Tạo tài khoản miễn phí <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>}
        </Button>
        </Form>

        <div className="mt-7 border-t border-stone-100 pt-6 text-center text-sm text-stone-600">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-bold text-brand-700 hover:text-brand-800 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default Register;
