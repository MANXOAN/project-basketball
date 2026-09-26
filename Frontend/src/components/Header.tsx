import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, LogIn, LogOut, User, Shield, CalendarDays, Menu, X, Home, Search, MapPin, Users, Map, Phone,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import BrandLogo from "./BrandLogo";

const NAV_ITEMS = [
  { to: "/", label: "Trang chủ", icon: Home, match: ["/"] },
  { to: "/fields", label: "Tìm sân", icon: Search, match: ["/fields", "/detail", "/field", "/booking"] },
  { to: "/clubs", label: "Cộng đồng", icon: Users, match: ["/clubs", "/tournaments", "/rankings"] },
  { to: "/map", label: "Bản đồ", icon: Map, match: ["/map", "/ban-do"] },
  { to: "/blog", label: "Tin tức", icon: BookOpen, match: ["/blog"] },
];

export default function Header() {
  const { user, loggedIn, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đóng menu mobile khi đổi trang hoặc bấm Esc.
  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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
    if (isStaff) {
      navigate("/admin");
    } else {
      toast.error("Tài khoản của bạn không có quyền quản trị");
    }
    setMobileOpen(false);
  };

  const isActive = (match: string[]) => match.some((path) =>
    path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(path + "/")
  );

  const initial = (user?.fullName || user?.email || "U")[0].toUpperCase();

  return (
    <header className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 ${scrolled ? "border-stone-200/80 bg-white/90 shadow-[0_8px_30px_-18px_rgb(28_25_23/0.25)] backdrop-blur-xl" : "border-transparent bg-white"}`}>
      <div className="hidden bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 text-white lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs font-semibold">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> TP. Hồ Chí Minh · Hà Nội</span>
            <a href="tel:0812288111" className="inline-flex items-center gap-1.5 hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> 081 22 88 111</a>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden xl:inline">Giảm 20% cho lần đặt sân đầu tiên với mã <strong className="rounded bg-white/20 px-1.5 py-0.5 tracking-wide">GOLDEN20</strong></span>
            <Link to="/contact" className="hover:underline">Dành cho đối tác</Link>
            <Link to="/contact" className="hover:underline">Hỗ trợ</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <BrandLogo />

          <nav className="hidden items-center gap-1 rounded-2xl bg-stone-100/70 p-1 lg:flex" aria-label="Điều hướng chính">
            {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
              const active = isActive(match);
              return (
                <NavLink
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${active ? "bg-white text-brand-700 shadow-sm ring-1 ring-stone-200/70" : "text-stone-600 hover:text-stone-950"}`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-brand-500" : "text-stone-400"}`} aria-hidden="true" />
                  {label}
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {loggedIn ? (
              <>
                <Link to="/my-bookings" className={`btn-ghost rounded-xl px-3 py-2 text-sm ${isActive(["/my-bookings"]) ? "bg-brand-50 text-brand-700" : ""}`}>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Đơn của tôi
                </Link>
                {isStaff && (
                  <button type="button" onClick={goAdmin} className="btn-ghost rounded-xl px-3 py-2 text-sm">
                    <Shield className="h-4 w-4" aria-hidden="true" /> Quản trị
                  </button>
                )}
                <Link to="/profile" className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-brand-300 hover:bg-brand-50" aria-label="Tài khoản của tôi">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-extrabold text-white">{initial}</span>
                  <span className="max-w-[96px] truncate text-sm font-semibold text-stone-800">{user?.fullName?.split(" ").pop() || "Tôi"}</span>
                </Link>
                <button type="button" onClick={handleLogout} className="grid h-10 w-10 place-items-center rounded-xl text-stone-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Đăng xuất" title="Đăng xuất">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost rounded-xl px-4 py-2 text-sm">
                  <LogIn className="h-4 w-4" aria-hidden="true" /> Đăng nhập
                </Link>
                <Link to="/register" className="btn-primary rounded-xl px-4 py-2.5 text-sm">
                  Đăng ký miễn phí
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            className="grid h-11 w-11 place-items-center rounded-xl text-stone-800 transition hover:bg-stone-100 lg:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-stone-100 bg-white lg:hidden">
          <div className="mx-auto max-h-[calc(100dvh-72px)] max-w-7xl overflow-y-auto px-4 pb-6 pt-3">
            <nav className="space-y-1" aria-label="Điều hướng chính">
              {NAV_ITEMS.map(({ to, label, icon: Icon, match }, index) => {
                const active = isActive(match);
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-current={active ? "page" : undefined}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className={`animate-slide-in-left flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition ${active ? "bg-brand-50 text-brand-700" : "text-stone-700 hover:bg-stone-50"}`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-brand-500" : "text-stone-400"}`} aria-hidden="true" /> {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 space-y-1 border-t border-stone-100 pt-3">
              {loggedIn ? (
                <>
                  <Link to="/my-bookings" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-stone-700 hover:bg-stone-50">
                    <CalendarDays className="h-5 w-5 text-stone-400" aria-hidden="true" /> Đơn của tôi
                  </Link>
                  <Link to="/profile" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-stone-700 hover:bg-stone-50">
                    <User className="h-5 w-5 text-stone-400" aria-hidden="true" /> {user?.fullName || "Tài khoản"}
                  </Link>
                  {isStaff && (
                    <button type="button" onClick={goAdmin} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-brand-700 hover:bg-brand-50">
                      <Shield className="h-5 w-5" aria-hidden="true" /> Trang quản trị
                    </button>
                  )}
                  <button type="button" onClick={handleLogout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-red-600 hover:bg-red-50">
                    <LogOut className="h-5 w-5" aria-hidden="true" /> Đăng xuất
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link to="/login" className="btn-outline min-h-12 rounded-xl text-sm">Đăng nhập</Link>
                  <Link to="/register" className="btn-primary min-h-12 rounded-xl text-sm">Đăng ký</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
