import { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Drawer, Badge } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ClipboardList, MapPin, LogOut, Bell, User, Ticket, Shield, Trophy, Menu as MenuIcon, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';

const { Sider, Content } = Layout;

const MENU_ITEMS = [
    { key: "/admin/dashboard", icon: LayoutDashboard, label: "Tổng quan", title: "Tổng quan hệ thống" },
    { key: "/admin/calendar", icon: CalendarDays, label: "Lịch đặt sân", title: "Lịch đặt sân" },
    { key: "/admin/bookings", icon: ClipboardList, label: "Danh sách đơn", title: "Quản lý đơn đặt sân" },
    { key: "/admin/courts", icon: MapPin, label: "Quản lý sân bãi", title: "Quản lý sân bãi", role: "manager" },
    { key: "/admin/facilities", icon: Trophy, label: "Cơ sở sân", title: "Cơ sở sân", role: "manager" },
    { key: "/admin/customers", icon: User, label: "Khách hàng", title: "Khách hàng" },
    { key: "/admin/vouchers", icon: Ticket, label: "Khuyến mãi", title: "Khuyến mãi", role: "admin" },
    { key: "/admin/employees", icon: Shield, label: "Phân quyền", title: "Phân quyền nhân viên", role: "admin" },
];

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => setDrawerOpen(false), [location.pathname]);

    const visible = MENU_ITEMS.filter((item) => !item.role || item.role === user?.role);
    const selectedKey = location.pathname === "/admin" ? "/admin/dashboard" : location.pathname;
    const current = visible.find((item) => item.key === selectedKey);

    const menu = (
        <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            className="premium-sider-menu"
            items={visible.map(({ key, icon: Icon, label }) => ({
                key,
                icon: <Icon size={18} aria-hidden="true" />,
                label: <Link to={key}>{label}</Link>,
            }))}
        />
    );

    const sidebar = (
        <div className="flex h-full flex-col">
            <div className="flex h-[72px] items-center border-b border-stone-100 px-5">
                <BrandLogo to="/admin/dashboard" subtitle="Control Center" />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
                <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-400">Quản trị</div>
                {menu}
            </div>
            <div className="border-t border-stone-100 p-3">
                <Link to="/" className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-stone-600 transition hover:bg-brand-50 hover:text-brand-700">
                    <ExternalLink size={16} aria-hidden="true" /> Về trang khách hàng
                </Link>
            </div>
        </div>
    );

    const userMenu = [
        { key: "profile", label: <Link to="/profile" className="flex items-center gap-2"><User size={14} /> Thông tin cá nhân</Link> },
        { type: "divider" as const },
        {
            key: "logout",
            danger: true,
            label: <button type="button" onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2"><LogOut size={14} /> Đăng xuất</button>,
        },
    ];

    return (
        <Layout className="min-h-screen bg-surface font-sans">
            <Sider width={264} className="!sticky top-0 hidden h-screen border-r border-stone-200 !bg-white lg:block" theme="light">
                {sidebar}
            </Sider>

            <Drawer placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={280} closable={false} styles={{ body: { padding: 0 } }}>
                {sidebar}
            </Drawer>

            <Layout className="min-w-0 bg-transparent">
                <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-stone-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl text-stone-700 transition hover:bg-stone-100 lg:hidden" aria-label="Mở menu quản trị">
                            <MenuIcon size={22} />
                        </button>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">GoldenState Admin</div>
                            <h1 className="m-0 truncate text-lg font-extrabold text-stone-950">{current?.title || "Bảng điều khiển"}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Badge count={3} size="small" color="#f97316" offset={[-4, 4]}>
                            <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:border-brand-300 hover:text-brand-700" aria-label="Thông báo (3 mới)">
                                <Bell size={18} />
                            </button>
                        </Badge>

                        <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={["click"]}>
                            <button type="button" className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white py-1.5 pl-1.5 pr-2 transition hover:border-brand-300 sm:pr-4">
                                <Avatar size={34} shape="square" className="!rounded-lg !bg-gradient-to-br from-brand-400 to-brand-600 font-extrabold !text-white">
                                    {(user?.fullName || user?.email || "U")[0].toUpperCase()}
                                </Avatar>
                                <span className="hidden text-left sm:block">
                                    <span className="block text-sm font-bold leading-tight text-stone-900">{user?.fullName || user?.email}</span>
                                    <span className="block text-[11px] font-semibold leading-tight text-stone-500">{user?.role === "manager" ? "Quản lý sân" : "Quản trị hệ thống"}</span>
                                </span>
                            </button>
                        </Dropdown>
                    </div>
                </header>

                <Content className="relative p-4 sm:p-8">
                    <div key={location.pathname} className="page-enter mx-auto w-full max-w-[1600px]">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
