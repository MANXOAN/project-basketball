import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Map, BookOpen, LogIn, LogOut, User, Shield, CalendarDays, Menu, X, Home,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function Header() {
  const { user, loggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileOpen(false);
  };

  const goAdmin = () => {
    if (!loggedIn) {
      toast.error("Vui lòng đăng nhập trước");
      navigate("/login", { state: { from: "/admin" } });
      return;
    }
    if (isAdmin) {
      navigate("/admin");
    } else {
      toast.error("Tài khoản của bạn không có quyền Admin");
    }
    setMobileOpen(false);
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    `relative flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-all duration-200 ${
      isActive(path)
        ? "text-black bg-[var(--color-gold)] hover:bg-[var(--color-yellow)]"
        : "text-gray-300 hover:text-white hover:bg-white/10"
    }`;

  return (
    <header className="sticky top-0 z-50 shadow-lg"
      style={{ background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-gold) 100%)` }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-xl shadow-inner">
              ⚽
            </div>
            <div className="leading-none">
              <div className="text-white font-extrabold text-lg tracking-tight">
                Golden<span className="text-yellow-400">State</span>
              </div>
              <div className="text-blue-200 text-[10px] font-medium tracking-wider uppercase">
                Sports Booking
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/" className={navLinkClass("/home")}>
              <Home className="w-4 h-4" /> Trang chủ
            </Link>
            <Link to="/fields" className={navLinkClass("/fields")}>
              ⚽ Tìm sân
            </Link>
            <Link to="/map" className={navLinkClass("/map")}>
              <Map className="w-4 h-4" /> Bản đồ
            </Link>
            <Link to="/blog" className={navLinkClass("/blog")}>
              <BookOpen className="w-4 h-4" /> Blog
            </Link>
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-2">
            {loggedIn ? (
              <>
                <Link
                  to="/my-bookings"
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
                >
                  <CalendarDays className="w-4 h-4" />
                  Đơn của tôi
                </Link>

                {isAdmin && (
                  <button
                    onClick={goAdmin}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30 px-3 py-2 rounded-lg transition-all"
                  >
                    <Shield className="w-4 h-4" /> Admin
                  </button>
                )}

                <Link
                  to="/profile"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-xs font-extrabold text-white shadow">
                    {(user?.fullName || user?.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white max-w-[90px] truncate">
                    {user?.fullName?.split(" ").pop() || "Tôi"}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-semibold text-red-300 hover:text-red-200 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
                >
                  <LogIn className="w-4 h-4" /> Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-4 py-2 rounded-lg shadow-lg transition-all"
                >
                  Đăng ký miễn phí
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-all"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 py-3 space-y-1 animate-fade-in-up">
            {[
              { to: "/", label: "Trang chủ", icon: "🏠" },
              { to: "/fields", label: "Tìm sân", icon: "⚽" },
              { to: "/map", label: "Bản đồ", icon: "🗺️" },
              { to: "/blog", label: "Blog", icon: "📖" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 text-sm font-semibold text-blue-100 hover:text-white hover:bg-white/10 px-3 py-3 rounded-lg transition-all"
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            ))}

            <div className="border-t border-white/10 pt-3 space-y-1">
              {loggedIn ? (
                <>
                  <Link
                    to="/my-bookings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 text-sm font-semibold text-blue-100 hover:text-white hover:bg-white/10 px-3 py-3 rounded-lg transition-all"
                  >
                    <CalendarDays className="w-4 h-4" /> Đơn của tôi
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 text-sm font-semibold text-blue-100 hover:text-white hover:bg-white/10 px-3 py-3 rounded-lg transition-all"
                  >
                    <User className="w-4 h-4" /> {user?.fullName || "Tài khoản"}
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={goAdmin}
                      className="w-full flex items-center gap-3 text-sm font-semibold text-yellow-300 hover:bg-white/10 px-3 py-3 rounded-lg transition-all"
                    >
                      <Shield className="w-4 h-4" /> Trang Admin
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-sm font-semibold text-red-300 hover:bg-white/10 px-3 py-3 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-sm font-semibold text-white border border-white/30 py-2.5 rounded-lg hover:bg-white/10 transition-all"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-sm font-bold bg-green-500 hover:bg-green-400 text-white py-2.5 rounded-lg transition-all"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
