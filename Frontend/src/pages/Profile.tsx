import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  User,
  UserRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { getToken, getUser, setAuth, type AuthUser } from "../lib/auth";

function initials(user: AuthUser | null) {
  return (user?.fullName || user?.email || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Profile() {
  const [user, setUser] = useState<AuthUser | null>(() => getUser());
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!profile.fullName.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }

    setProfileLoading(true);
    try {
      const response = await api.patch<AuthUser>(`/users/${user.id}`, {
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      const updatedUser = response.data;
      const token = getToken();
      if (token) setAuth(token, updatedUser);
      setUser(updatedUser);
      toast.success("Đã cập nhật thông tin tài khoản");
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể cập nhật thông tin");
    } finally {
      setProfileLoading(false);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (passwords.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.patch(`/users/${user.id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Đã đổi mật khẩu thành công");
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể đổi mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  const inputBase =
    "min-h-12 w-full rounded-xl border border-stone-200 bg-white py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition hover:border-stone-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";
  const labelBase = "mb-2 block text-sm font-semibold text-stone-700";

  return (
    <div className="min-h-screen bg-surface px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="relative mx-auto max-w-6xl">
        {/* Hero */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-6 text-white shadow-brand sm:p-10 animate-fade-in-up">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-brand-400/40 blur-3xl" aria-hidden="true" />
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-16 right-6 h-64 w-64 text-white/10" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <circle cx="100" cy="100" r="90" />
            <path d="M10 100h180M100 10v180" />
            <path d="M36 36c22 18 33 40 33 64s-11 46-33 64M164 36c-22 18-33 40-33 64s11 46 33 64" />
          </svg>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Tài khoản thành viên
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Hồ sơ cá nhân</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
                Quản lý thông tin tài khoản và tăng cường bảo mật tại GoldenState.
              </p>
            </div>

            <Link
              to="/my-bookings"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 shadow-lg shadow-brand-900/20 transition hover:-translate-y-0.5 hover:bg-brand-50 sm:self-auto"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Lịch sử đặt sân
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
          {/* Avatar side card */}
          <aside className="card h-fit p-6 text-center sm:p-8 lg:sticky lg:top-28" data-reveal>
            <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-3xl font-extrabold text-white shadow-brand ring-4 ring-white">
              <span className="absolute inset-0 overflow-hidden rounded-3xl">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.fullName || "Ảnh đại diện"} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center">{initials(user)}</span>
                )}
              </span>
              <span className="absolute -bottom-1.5 -right-1.5 grid h-9 w-9 place-items-center rounded-xl border border-stone-200 bg-white text-brand-600 shadow-soft" aria-hidden="true">
                <Camera className="h-4 w-4" />
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-stone-950">{user.fullName || "Chưa cập nhật họ tên"}</h2>
            <p className="mt-1 break-all text-sm text-stone-500">{user.email}</p>
            <span className="chip mt-3">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Thành viên thường trực
            </span>

            <dl className="mt-6 space-y-3 border-t border-stone-100 pt-6 text-left text-sm">
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <dt className="sr-only">Email</dt>
                <dd className="truncate text-stone-700">{user.email}</dd>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                <Phone className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <dt className="sr-only">Số điện thoại</dt>
                <dd className={user.phone ? "text-stone-700" : "text-stone-500 italic"}>{user.phone || "Chưa cập nhật SĐT"}</dd>
              </div>
            </dl>
          </aside>

          {/* Forms container */}
          <div className="space-y-6 lg:space-y-8">
            {/* Update Info */}
            <form onSubmit={updateProfile} className="card p-6 sm:p-8" data-reveal>
              <div className="mb-6 flex items-start gap-3 border-b border-stone-100 pb-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-950">Thông tin cơ bản</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Thông tin này giúp tự động điền khi đặt sân nhanh chóng.</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="profile-fullname" className={labelBase}>Họ và tên</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                    <input
                      id="profile-fullname"
                      autoComplete="name"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className={`${inputBase} pl-11 pr-4`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-email" className={labelBase}>Email đăng nhập</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                    <input
                      id="profile-email"
                      value={user.email}
                      disabled
                      className="min-h-12 w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-100 py-3 pl-11 pr-4 text-sm text-stone-500"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-500">Email không thể thay đổi.</p>
                </div>

                <div>
                  <label htmlFor="profile-phone" className={labelBase}>Số điện thoại</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                    <input
                      id="profile-phone"
                      type="tel"
                      autoComplete="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="Nhập số điện thoại"
                      className={`${inputBase} pl-11 pr-4`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-stone-100 pt-5">
                <button
                  disabled={profileLoading}
                  className="btn-primary min-h-11 w-full rounded-xl px-6 py-3 text-sm disabled:opacity-60 sm:w-auto"
                >
                  {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                  {profileLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>

            {/* Change Password */}
            <form onSubmit={updatePassword} className="card p-6 sm:p-8" data-reveal style={{ "--reveal-index": 1 } as React.CSSProperties}>
              <div className="mb-6 flex items-start gap-3 border-b border-stone-100 pb-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-950">Đổi mật khẩu</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Định kỳ thay đổi mật khẩu để bảo vệ an toàn cho tài khoản.</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="pw-current" className={labelBase}>Mật khẩu hiện tại</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                    <input
                      id="pw-current"
                      required
                      type="password"
                      autoComplete="current-password"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      className={`${inputBase} pl-11 pr-4`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pw-new" className={labelBase}>Mật khẩu mới</label>
                  <input
                    id="pw-new"
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className={`${inputBase} px-4`}
                  />
                  <p className="mt-1.5 text-xs text-stone-500">Tối thiểu 6 ký tự.</p>
                </div>

                <div>
                  <label htmlFor="pw-confirm" className={labelBase}>Xác nhận mật khẩu</label>
                  <input
                    id="pw-confirm"
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className={`${inputBase} px-4`}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-stone-100 pt-5">
                <button
                  disabled={passwordLoading}
                  className="btn-outline min-h-11 w-full rounded-xl px-6 py-3 text-sm disabled:opacity-60 sm:w-auto"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Cập nhật mật khẩu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
