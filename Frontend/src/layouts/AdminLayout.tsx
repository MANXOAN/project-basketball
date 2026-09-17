import { Layout, Menu, Avatar, Dropdown } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ClipboardList, MapPin, LogOut, Bell, Settings, User, Ticket, Shield } from 'lucide-react';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
    const location = useLocation();

    const menuItems = [
        {
            key: "/admin/dashboard",
            icon: <LayoutDashboard size={20} />,
            label: <Link to="/admin/dashboard" className="text-base font-medium">Tổng quan</Link>,
        },
        {
            key: "/admin/calendar",
            icon: <CalendarDays size={20} />,
            label: <Link to="/admin/calendar" className="text-base font-medium">Lịch đặt sân</Link>,
        },
        {
            key: "/admin/bookings",
            icon: <ClipboardList size={20} />,
            label: <Link to="/admin/bookings" className="text-base font-medium">Danh sách đơn</Link>,
        },
        {
            key: "/admin/courts",
            icon: <MapPin size={20} />,
            label: <Link to="/admin/courts" className="text-base font-medium">Quản lí sân bãi</Link>,
        },
        {
            key: "/admin/customers",
            icon: <User size={20} />,
            label: <Link to="/admin/customers" className="text-base font-medium">Khách hàng</Link>,
        },
        {
            key: "/admin/vouchers",
            icon: <Ticket size={20} />,
            label: <Link to="/admin/vouchers" className="text-base font-medium">Khuyến mãi</Link>,
        },
        {
            key: "/admin/employees",
            icon: <Shield size={20} />,
            label: <Link to="/admin/employees" className="text-base font-medium">Phân quyền</Link>,
        },
    ];

    const userMenu = [
        {
            key: "profile",
            label: <span className="flex items-center gap-2"><User size={16} /> Thông tin cá nhân</span>,
        },
        {
            key: "settings",
            label: <span className="flex items-center gap-2"><Settings size={16} /> Cài đặt hệ thống</span>,
        },
        { type: "divider" as const },
        {
            key: "logout",
            danger: true,
            label: <Link to="/" className="flex items-center gap-2"><LogOut size={16} /> Đăng xuất</Link>,
        },
    ];

    return (
        <Layout className="min-h-screen font-sans bg-[#f3f4f6]" style={{ background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }}>
            {/* Lớp nền trang trí */}
            <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] rounded-full bg-blue-300/20 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-300/20 blur-[100px] pointer-events-none" />

            <Sider
                width={280}
                theme="light"
                className="bg-white/70 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white m-6 mb-8 rounded-[2rem] overflow-hidden sticky top-6 custom-sider"
                style={{ height: 'calc(100vh - 56px)' }}
            >
                <div className="h-24 flex items-center justify-center mb-2 px-4 mt-4">
                    {/* Đã đổi to="/admin/dashboard" thành to="/" */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1rem] flex justify-center items-center shadow-lg shadow-blue-500/30 text-white font-black text-2xl transition-transform group-hover:scale-110 group-hover:rotate-3">
                            A
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-900 font-extrabold tracking-tight text-2xl">
                            Admin<span className="text-blue-600">Pro</span>
                        </span>
                    </Link>
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    style={{ background: 'transparent' }}
                    className="border-none px-4 space-y-1 font-semibold !bg-transparent premium-sider-menu"
                />
            </Sider>
            <Layout className="bg-transparent relative">
                <Header
                    className="mx-8 mt-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white px-8 flex justify-between items-center h-20 sticky top-6 z-50 transition-all"
                    style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)' }}
                >
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 m-0 tracking-tight">Hệ thống quản lý thể thao</h2>
                        <span className="text-xs text-gray-500 font-medium tracking-wide">Chào mừng trở lại, Administrator!</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative cursor-pointer transition-all hover:scale-110 hover:-translate-y-1 bg-white p-2.5 rounded-[1rem] shadow-sm border border-gray-100 text-gray-500 hover:text-blue-600">
                            <Bell size={20} className="stroke-[2px]" />
                            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ring-2 ring-white">3</span>
                        </div>
                        <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
                            <div className="flex items-center gap-3 cursor-pointer hover:bg-white/80 p-1.5 pr-4 rounded-[1rem] transition-all border border-transparent hover:border-gray-200 hover:shadow-sm">
                                <Avatar size={40} className="bg-gradient-to-r from-indigo-500 to-purple-600 font-bold shadow-md shadow-purple-500/30">AD</Avatar>
                                <div className="hidden sm:block">
                                    <div className="text-sm font-bold text-gray-800 leading-none mb-1">Admin System</div>
                                    <div className="text-[10px] text-blue-600 font-bold tracking-wide uppercase leading-none">Quản trị viên</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content className="p-10 overflow-auto relative z-10">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}