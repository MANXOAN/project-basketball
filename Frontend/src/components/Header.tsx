import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, LogIn, LogOut, User, Shield, CalendarDays, Menu, X, Home, Trophy,
  Search, MapPin, Languages, Users, Map,
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
    `relative flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-all duration-200 ${
      isActive(path)
        ? "text-slate-950 bg-amber-400"
        : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="hidden border-b border-slate-100 bg-slate-950 text-slate-300 lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs font-semibold">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-amber-400" /> TP. Hồ Chí Minh</span>
            <span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-amber-400" /> Tiếng Việt</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/contact" className="transition-colors hover:text-white">Dành cho đối tác</Link>
            <Link to="/blog" className="transition-colors hover:text-white">Tin tức</Link>
            <Link to="/contact" className="transition-colors hover:text-white">Hỗ trợ</Link>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-[68px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-yellow-400 flex items-center justify-center shadow-lg shadow-slate-900/15">
              <Trophy className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="leading-none">
              <div className="text-slate-950 font-extrabold text-lg tracking-tight">
                Golden<span className="text-amber-500">State</span>
              </div>
              <div className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                Basketball Booking
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/" className={navLinkClass("/")}>
              Trang chủ
            </Link>
            <Link to="/fields" className={navLinkClass("/fields")}>
              Sân tập
            </Link>
            <Link to="/clubs" className={`${navLinkClass("/clubs")} ${isActive("/tournaments") || isActive("/rankings") ? "text-slate-950 bg-amber-400" : ""}`}>
              <Users className="w-4 h-4" /> Cộng đồng
            </Link>
            <Link to="/map" className={navLinkClass("/map")}>
              <Map className="w-4 h-4" /> Bản đồ
            </Link>
            <Link to="/blog" className={navLinkClass("/blog")}>
              <BookOpen className="w-4 h-4" /> Tin tức
            </Link>
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-2">
            {loggedIn ? (
              <>
                <Link
                  to="/my-bookings"
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-100 px-3 py-2 rounded-xl transition-all"
                >
                  <CalendarDays className="w-4 h-4" />
                  Đơn của tôi
                </Link>

                {isAdmin && (
                  <button
                    onClick={goAdmin}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl transition-all"
                  >
                    <Shield className="w-4 h-4" /> Admin
                  </button>
                )}

                <Link
                  to="/profile"
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-xs font-extrabold text-white shadow">
                    {(user?.fullName || user?.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-800 max-w-[90px] truncate">
                    {user?.fullName?.split(" ").pop() || "Tôi"}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-100 px-4 py-2 rounded-xl transition-all"
                >
                  <LogIn className="w-4 h-4" /> Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 text-sm font-bold bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 transition-all"
                >
                  Đăng ký miễn phí
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            className="lg:hidden p-2 rounded-lg text-slate-800 hover:bg-slate-100 transition-all"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-1 animate-fade-in-up">
            {[
              { to: "/", label: "Trang chủ", icon: <Home className="w-4 h-4" /> },
              { to: "/fields", label: "Tìm sân", icon: <Search className="w-4 h-4" /> },
              { to: "/clubs", label: "Cộng đồng", icon: <Users className="w-4 h-4" /> },
              { to: "/map", label: "Bản đồ", icon: <Map className="w-4 h-4" /> },
              { to: "/blog", label: "Tin tức", icon: <BookOpen className="w-4 h-4" /> },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 px-3 py-3 rounded-lg transition-all"
              >
                {item.icon} {item.label}
              </Link>
            ))}

            <div className="border-t border-slate-200 pt-3 space-y-1">
              {loggedIn ? (
                <>
                  <Link
                    to="/my-bookings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 px-3 py-3 rounded-lg transition-all"
                  >
                    <CalendarDays className="w-4 h-4" /> Đơn của tôi
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 px-3 py-3 rounded-lg transition-all"
                  >
                    <User className="w-4 h-4" /> {user?.fullName || "Tài khoản"}
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={goAdmin}
                      className="w-full flex items-center gap-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 px-3 py-3 rounded-lg transition-all"
                    >
                      <Shield className="w-4 h-4" /> Trang Admin
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-3 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-sm font-semibold text-slate-800 border border-slate-300 py-2.5 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center text-sm font-bold bg-slate-950 hover:bg-slate-800 text-white py-2.5 rounded-lg transition-all"
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
