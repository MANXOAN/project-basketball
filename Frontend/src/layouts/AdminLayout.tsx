import { Layout, Menu, Avatar, Dropdown } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ClipboardList, MapPin, LogOut, Bell, Settings, User, Ticket, Shield, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const menuItems = [
        {
            key: "/admin/dashboard",
            icon: <LayoutDashboard size={18} />,
            label: <Link to="/admin/dashboard" className="text-sm font-semibold">Tổng quan</Link>,
        },
        {
            key: "/admin/calendar",
            icon: <CalendarDays size={18} />,
            label: <Link to="/admin/calendar" className="text-sm font-semibold">Lịch đặt sân</Link>,
        },
        {
            key: "/admin/bookings",
            icon: <ClipboardList size={18} />,
            label: <Link to="/admin/bookings" className="text-sm font-semibold">Danh sách đơn</Link>,
        },
        {
            key: "/admin/courts",
            icon: <MapPin size={18} />,
            label: <Link to="/admin/courts" className="text-sm font-semibold">Quản lý sân bãi</Link>,
        },
        {
            key: "/admin/customers",
            icon: <User size={18} />,
            label: <Link to="/admin/customers" className="text-sm font-semibold">Khách hàng</Link>,
        },
        {
            key: "/admin/vouchers",
            icon: <Ticket size={18} />,
            label: <Link to="/admin/vouchers" className="text-sm font-semibold">Khuyến mãi</Link>,
        },
        {
            key: "/admin/employees",
            icon: <Shield size={18} />,
            label: <Link to="/admin/employees" className="text-sm font-semibold">Phân quyền</Link>,
        },
    ];

    const userMenu = [
        {
            key: "profile",
            label: <span className="flex items-center gap-2 text-xs"><User size={14} /> Thông tin cá nhân</span>,
        },
        {
            key: "settings",
            label: <span className="flex items-center gap-2 text-xs"><Settings size={14} /> Cài đặt hệ thống</span>,
        },
        { type: "divider" as const },
        {
            key: "logout",
            danger: true,
            label: <button type="button" onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-xs"><LogOut size={14} /> Đăng xuất</button>,
        },
    ];

    return (
        <Layout className="min-h-screen font-sans bg-black text-gray-200">
            {/* Lớp nền ambient glow */}
            <div className="absolute top-[5%] left-[10%] w-[350px] h-[350px] rounded-full bg-yellow-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-yellow-500/5 blur-[140px] pointer-events-none" />

            <Sider
                width={270}
                theme="dark"
                className="bg-zinc-950 border-r border-white/5 m-4 mb-4 rounded-3xl overflow-hidden sticky top-4 custom-sider shadow-2xl"
                style={{ height: 'calc(100vh - 32px)', background: '#09090b' }}
            >
                <div className="h-20 flex items-center px-6 mt-2 border-b border-white/5">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex justify-center items-center text-xl group-hover:scale-105 transition-transform">
                            <Trophy className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                            <span className="text-white font-extrabold tracking-tight text-lg">
                                Golden<span className="text-yellow-400">Admin</span>
                            </span>
                            <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest">
                                Control Center
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="p-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black px-4 py-2">
                        Quản trị hệ thống
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{ background: 'transparent' }}
                        className="border-none space-y-1 font-semibold !bg-transparent text-gray-400"
                    />
                </div>
            </Sider>

            <Layout className="bg-transparent relative">
                <Header
                    className="mx-6 mt-4 rounded-2xl border border-white/10 px-8 flex justify-between items-center h-18 sticky top-4 z-50 transition-all shadow-xl"
                    style={{ background: 'rgba(18, 18, 20, 0.85)', backdropFilter: 'blur(16px)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <div>
                            <h2 className="text-base font-bold text-white m-0 tracking-tight">Hệ Thống Quản Lý GoldenState</h2>
                            <span className="text-xs text-gray-400 font-medium">Bảng điều khiển hoạt động sân bóng rổ</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="relative cursor-pointer transition-all hover:scale-105 bg-black/60 p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-yellow-400">
                            <Bell size={18} />
                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                                3
                            </span>
                        </div>

                        <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
                            <div className="flex items-center gap-3 cursor-pointer bg-black/60 hover:bg-black/90 p-1.5 pr-4 rounded-xl transition-all border border-white/10">
                                <Avatar size={34} className="bg-gradient-to-br from-yellow-400 to-amber-600 text-black font-black">
                                    AD
                                </Avatar>
                                <div className="hidden sm:block text-left">
                                    <div className="text-xs font-bold text-white leading-none mb-1">Quản Trị Viên</div>
                                    <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider leading-none">Super Admin</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="p-8 overflow-auto relative z-10">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
