import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Select, message, Spin, Tag, Input, Popconfirm, Space, Switch } from "antd";
import { Users, Shield, ShieldCheck, Mail, Lock, Plus, UserRound, Activity, Edit } from "lucide-react";
import { api } from "../../lib/api";

export default function AdminEmployees() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        try {
            const res = await api.get("/users");
            setUsers(res.data);
        } catch {
            message.error("Lỗi lấy danh sách");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSave = async (values: any) => {
        try {
            const payload = {
                name: values.fullName || values.name,
                fullName: values.fullName || values.name,
                email: values.email,
                password: values.password,
                phone: values.phone || "",
                role: values.role || "manager",
            };
    
            if (editingUser) await api.patch(`/users/${editingUser.id}/admin`, payload);
            else await api.post("/users", payload);
    
            message.success(editingUser ? "Cập nhật nhân sự thành công!" : "Tạo nhân viên thành công!");
            setIsModalOpen(false);
            form.resetFields(); setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            // Bắt thông báo lỗi từ Backend trả về (ví dụ: "Email already exists")
            const errorMsg = error.response?.data?.message || "Lỗi khi tạo nhân viên!";
            if (errorMsg.includes("Email already exists")) {
                message.error("Email này đã được sử dụng. Vui lòng nhập email khác!");
            } else {
                message.error(errorMsg);
            }
        }
    };

    const openModal = (user?: any) => { setEditingUser(user || null); form.setFieldsValue(user || { role: "manager" }); setIsModalOpen(true); };
    const toggleStatus = async (user: any) => {
        try { await api.patch(`/users/${user.id}/status`, { isActive: !user.isActive }); message.success(user.isActive ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản"); fetchUsers(); }
        catch (error: any) { message.error(error.response?.data?.message || "Không thể cập nhật trạng thái"); }
    };

    const changeRole = async (id: number, newRole: string) => {
        try {
            await api.patch(`/users/${id}/role`, { role: newRole });
            message.success("Thay đổi quyền thành công");
            fetchUsers();
        } catch {
            message.error("Lỗi");
        }
    };

    const columns = [
        {
            title: "Họ tên",
            dataIndex: "fullName",
            render: (t: string) => <span className="font-bold text-gray-800">{t}</span>
        },
        { title: "Trạng thái", render: (_: unknown, user: any) => <Switch checked={user.isActive !== false} checkedChildren="Hoạt động" unCheckedChildren="Đã khóa" onChange={() => toggleStatus(user)} /> },
        { title: "Thao tác", align: "right" as const, render: (_: unknown, user: any) => <Space><Button type="text" aria-label={`Sửa ${user.fullName}`} onClick={() => openModal(user)}><Edit size={18} /></Button><Popconfirm title={user.isActive === false ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?"} onConfirm={() => toggleStatus(user)} okText="Xác nhận" cancelText="Hủy"><Button type="text" danger={user.isActive !== false}>{user.isActive === false ? "Mở khóa" : "Khóa"}</Button></Popconfirm></Space> },
        {
            title: "Email / Đăng nhập",
            dataIndex: "email",
            render: (t: string) => <span className="text-gray-500 font-medium flex items-center"><Mail size={14} className="mr-1" /> {t}</span>
        },
        {
            title: "Vai trò (Phân quyền)",
            dataIndex: "role",
            render: (r: string, record: any) => (
                <Select
                    value={r}
                    onChange={v => changeRole(record.id, v)}
                    className="w-40 font-bold"
                    options={[
                        { value: 'admin', label: <span className="text-red-600 flex items-center"><ShieldCheck size={14} className="mr-1" /> Quản trị hệ thống</span> },
                        { value: 'manager', label: <span className="text-blue-600 flex items-center"><Lock size={14} className="mr-1" /> Quản lý sân</span> },
                        { value: 'user', label: <span className="text-emerald-600 flex items-center"><Users size={14} className="mr-1" /> Khách hàng</span> }
                    ]}
                />
            )
        },
        {
            title: "Quyền hạn",
            dataIndex: "role",
            render: (r: string) => {
                if (r === 'admin') return <Tag color="red">Quản trị hệ thống</Tag>;
                if (r === 'manager') return <Tag color="blue">Quản lý sân và lịch</Tag>;
                return <Tag>Khách hàng</Tag>;
            }
        }
    ];

    if (loading) return <div className="flex justify-center py-40"><Spin size="large" /></div>;

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400 mb-2"><ShieldCheck size={14} /> Access control</div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        Phân Quyền Nhân Sự (RBAC)
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Bảo mật hệ thống, cấp quyền truy cập theo từng chức vụ</p>
                </div>
                <Button size="large" type="primary" onClick={() => openModal()} className="!bg-yellow-500 hover:!bg-yellow-400 !text-black font-bold px-6 !border-0 shadow-lg shadow-yellow-500/20 flex items-center h-12 rounded-2xl transition-all hover:scale-105">
                    <Plus className="mr-2" size={20} /> Thêm nhân sự
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[{ label: "Tổng tài khoản", value: users.length, icon: Users }, { label: "Quản trị hệ thống", value: users.filter((u) => u.role === "admin").length, icon: ShieldCheck }, { label: "Quản lý sân", value: users.filter((u) => u.role === "manager").length, icon: Activity }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-yellow-500/15 bg-zinc-900 p-5 flex items-center justify-between"><div><div className="text-2xl font-black text-white">{item.value}</div><div className="text-xs text-gray-500 mt-1">{item.label}</div></div><Icon className="text-yellow-400" size={24} /></div>; })}
            </div>
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-white/5 p-6 overflow-hidden">
                <Table
                    className="modern-table mt-2"
                    dataSource={users}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: <div className="py-12 text-center text-gray-500"><UserRound className="mx-auto mb-3 text-yellow-500" /><p>Chưa có nhân sự trong hệ thống</p></div> }}
                    components={{ header: { cell: (props: any) => <th {...props} className="!bg-black/30 !text-gray-500 font-bold uppercase text-xs tracking-wider !border-b-white/10 py-4" /> } }}
                />
            </div>

            <Modal
                title={<div className="font-black text-xl flex items-center gap-2"><Shield className="text-blue-500" /> {editingUser ? "Cập nhật Nhân Sự" : "Thêm Nhân Sự Mới"}</div>}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingUser(null); }}
                footer={null}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4" initialValues={{ role: 'manager' }}>
                    <Form.Item name="fullName" label="Tên nhân viên" rules={[{ required: true }]}>
                        <Input size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, type: 'email' }]}>
                        <Input size="large" className="rounded-xl" />
                    </Form.Item>
                    {!editingUser && <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{ required: true }, { min: 6, message: "Tối thiểu 6 ký tự" }]}>
                        <Input.Password size="large" className="rounded-xl" autoComplete="new-password" />
                    </Form.Item>}
                    <Form.Item name="role" label={<span className="font-semibold text-gray-700 mt-2">Vai trò</span>} rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl">
                            <Select.Option value="admin">Admin - Quản trị hệ thống</Select.Option>
                            <Select.Option value="manager">Quản lý sân - Quản lý sân và lịch</Select.Option>
                            <Select.Option value="user">User - Khách hàng</Select.Option>
                        </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 border-0 shadow-lg shadow-cyan-500/30 h-12 text-lg font-black rounded-2xl">
                        {editingUser ? "LƯU THAY ĐỔI" : "TẠO TÀI KHOẢN"}
                    </Button>
                </Form>
            </Modal>
        </div>
    )
}
