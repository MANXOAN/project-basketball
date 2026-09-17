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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể cập nhật thông tin");
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể đổi mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-6xl">
        {/* Header bar */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end bg-zinc-900 rounded-3xl border border-white/5 p-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
              <Sparkles className="w-4 h-4" /> Tài khoản thành viên
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Hồ Sơ Cá Nhân
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Quản lý thông tin tài khoản và tăng cường bảo mật tại GoldenState.
            </p>
          </div>

          <Link
            to="/my-bookings"
            className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm"
          >
            <CalendarDays className="h-4 w-4" />
            Lịch sử đặt sân
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Avatar side card */}
          <aside className="rounded-3xl border border-white/5 bg-zinc-900 p-8 text-center h-fit">
            <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 text-3xl font-black text-black shadow-xl shadow-yellow-500/20 border-2 border-yellow-400">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName || "Avatar"} className="h-full w-full object-cover" />
              ) : (
                initials(user)
              )}
              <span className="absolute bottom-1 right-1 rounded-xl bg-black/80 border border-white/10 p-1.5 text-yellow-400">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </div>

            <h2 className="font-extrabold text-white text-lg">{user.fullName || "Chưa cập nhật họ tên"}</h2>
            <p className="mt-1 break-all text-xs text-gray-400">{user.email}</p>

            <div className="mt-6 space-y-3 border-t border-white/5 pt-6 text-xs text-left">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="h-4 w-4 text-yellow-500 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>{user.phone || "Chưa cập nhật SĐT"}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <ShieldCheck className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>Thành viên thường trực</span>
              </div>
            </div>
          </aside>

          {/* Forms container */}
          <div className="space-y-8">
            {/* Update Info */}
            <form onSubmit={updateProfile} className="rounded-3xl border border-white/5 bg-zinc-900 p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-2.5 text-yellow-500">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Thông tin cơ bản</h2>
                  <p className="text-xs text-gray-400">Thông tin này giúp tự động điền khi đặt sân nhanh chóng.</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Họ và tên</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <input
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className="w-full rounded-xl bg-black border border-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email đăng nhập</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <input
                      value={user.email}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl bg-black/50 border border-white/5 py-3 pl-11 pr-4 text-sm text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="Nhập số điện thoại"
                      className="w-full rounded-xl bg-black border border-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={profileLoading}
                className="btn-primary mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {profileLoading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>

            {/* Change Password */}
            <form onSubmit={updatePassword} className="rounded-3xl border border-white/5 bg-zinc-900 p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-2.5 text-yellow-500">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Đổi mật khẩu</h2>
                  <p className="text-xs text-gray-400">Định kỳ thay đổi mật khẩu để bảo vệ an toàn cho tài khoản.</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <input
                      required
                      type="password"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      className="w-full rounded-xl bg-black border border-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500"
                  />
                </div>
              </div>

              <button
                disabled={passwordLoading}
                className="btn-outline mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {passwordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  "Cập nhật mật khẩu"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
