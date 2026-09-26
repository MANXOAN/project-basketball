import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Select, message, Input, Popconfirm, Switch, Tooltip } from "antd";
import { Users, Shield, ShieldCheck, Mail, Lock, Plus, UserRound, Activity, Edit } from "lucide-react";
import { api } from "../../lib/api";

type StaffUser = { id: number; fullName: string; name?: string; email: string; phone?: string; role: string; isActive?: boolean };
type StaffFormValues = { fullName?: string; name?: string; email: string; password?: string; phone?: string; role?: string };
type ApiError = { response?: { data?: { message?: string } } };

const ROLE_META: Record<string, { label: string; scope: string; cls: string }> = {
    admin: { label: "Quản trị hệ thống", scope: "Toàn quyền hệ thống", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    manager: { label: "Quản lý sân", scope: "Quản lý sân và lịch", cls: "bg-brand-50 text-brand-800 ring-brand-200" },
    user: { label: "Khách hàng", scope: "Đặt sân, xem lịch cá nhân", cls: "bg-stone-100 text-stone-700 ring-stone-200" },
};

export default function AdminEmployees() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
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

    const handleSave = async (values: StaffFormValues) => {
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
        } catch (error: unknown) {
            // Bắt thông báo lỗi từ Backend trả về (ví dụ: "Email already exists")
            const errorMsg = (error as ApiError).response?.data?.message || "Lỗi khi tạo nhân viên!";
            if (errorMsg.includes("Email already exists")) {
                message.error("Email này đã được sử dụng. Vui lòng nhập email khác!");
            } else {
                message.error(errorMsg);
            }
        }
    };

    const openModal = (user?: StaffUser) => { setEditingUser(user || null); form.setFieldsValue(user || { role: "manager" }); setIsModalOpen(true); };
    const toggleStatus = async (user: StaffUser) => {
        try { await api.patch(`/users/${user.id}/status`, { isActive: !user.isActive }); message.success(user.isActive ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản"); fetchUsers(); }
        catch (error: unknown) { message.error((error as ApiError).response?.data?.message || "Không thể cập nhật trạng thái"); }
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
            title: "Nhân sự",
            dataIndex: "fullName",
            width: 280,
            render: (t: string, record: StaffUser) => (
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100">{(t || record.email || "?").trim().charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                        <div className="truncate font-bold text-stone-900">{t}</div>
                        <div className="flex min-w-0 items-center gap-1 text-xs text-stone-500"><Mail size={12} className="shrink-0" aria-hidden="true" /><span className="truncate">{record.email}</span></div>
                    </div>
                </div>
            )
        },
        {
            title: "Vai trò",
            dataIndex: "role",
            width: 210,
            render: (r: string, record: StaffUser) => (
                <Select
                    value={r}
                    onChange={v => changeRole(record.id, v)}
                    aria-label={`Vai trò của ${record.fullName}`}
                    className="w-48"
                    options={[
                        { value: 'admin', label: <span className="flex items-center gap-1.5 font-semibold text-rose-700"><ShieldCheck size={14} aria-hidden="true" /> Quản trị hệ thống</span> },
                        { value: 'manager', label: <span className="flex items-center gap-1.5 font-semibold text-brand-700"><Lock size={14} aria-hidden="true" /> Quản lý sân</span> },
                        { value: 'user', label: <span className="flex items-center gap-1.5 font-semibold text-stone-700"><Users size={14} aria-hidden="true" /> Khách hàng</span> }
                    ]}
                />
            )
        },
        {
            title: "Quyền hạn",
            dataIndex: "role",
            key: "scope",
            width: 190,
            render: (r: string) => {
                const meta = ROLE_META[r] || ROLE_META.user;
                return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.cls}`}>{meta.scope}</span>;
            }
        },
        {
            title: "Trạng thái",
            key: "active",
            width: 140,
            render: (_: unknown, user: StaffUser) => <Switch checked={user.isActive !== false} checkedChildren="Hoạt động" unCheckedChildren="Đã khóa" aria-label={`Trạng thái tài khoản ${user.fullName}`} onChange={() => toggleStatus(user)} className={user.isActive !== false ? "!bg-emerald-600" : ""} />
        },
        {
            title: "Thao tác", align: "right" as const, width: 150,
            render: (_: unknown, user: StaffUser) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Sửa"><Button type="text" aria-label={`Sửa ${user.fullName}`} icon={<Edit size={17} />} onClick={() => openModal(user)} /></Tooltip>
                    <Popconfirm title={user.isActive === false ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?"} onConfirm={() => toggleStatus(user)} okText="Xác nhận" cancelText="Hủy">
                        <Button size="small" danger={user.isActive !== false}>{user.isActive === false ? "Mở khóa" : "Khóa"}</Button>
                    </Popconfirm>
                </div>
            )
        },
    ];

    if (loading) return (
        <div className="space-y-6 pb-10" aria-busy="true" aria-label="Đang tải nhân sự">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[88px] !rounded-3xl" />)}</div>
            <div className="skeleton h-[420px] !rounded-3xl" />
        </div>
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-stone-600">Cấp quyền truy cập theo chức vụ (RBAC) và khóa/mở tài khoản nhân sự.</p>
                <Button size="large" type="primary" onClick={() => openModal()} icon={<Plus size={18} aria-hidden="true" />} className="self-start sm:self-auto">
                    Thêm nhân sự
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[{ label: "Tổng tài khoản", value: users.length, icon: Users }, { label: "Quản trị hệ thống", value: users.filter((u) => u.role === "admin").length, icon: ShieldCheck }, { label: "Quản lý sân", value: users.filter((u) => u.role === "manager").length, icon: Activity }].map((item) => { const Icon = item.icon; return (
                    <div key={item.label} className="card flex items-center justify-between gap-3 !rounded-2xl p-3.5 sm:!rounded-3xl sm:p-5">
                        <div><div className="text-2xl font-extrabold text-stone-950 tabular-nums">{item.value}</div><div className="mt-0.5 text-[11px] font-semibold leading-tight text-stone-500 sm:text-xs">{item.label}</div></div>
                        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 sm:grid"><Icon size={20} aria-hidden="true" /></span>
                    </div>); })}
            </div>

            <section className="card overflow-hidden" aria-label="Danh sách nhân sự">
                <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                    <h2 className="m-0 text-base font-extrabold text-stone-950">Tài khoản & phân quyền <span className="ml-1 text-sm font-semibold text-stone-500">({users.length})</span></h2>
                </div>
                <Table
                    className="modern-table"
                    dataSource={users}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 970 }}
                    locale={{ emptyText: <div className="py-12 text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><UserRound size={22} aria-hidden="true" /></span><div className="font-semibold text-stone-700">Chưa có nhân sự trong hệ thống</div></div> }}
                />
            </section>

            <Modal
                title={<div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100"><Shield size={20} aria-hidden="true" /></span><span className="text-lg font-extrabold text-stone-950">{editingUser ? "Cập nhật nhân sự" : "Thêm nhân sự mới"}</span></div>}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingUser(null); }}
                footer={null}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4" initialValues={{ role: 'manager' }} requiredMark={false}>
                    <Form.Item name="fullName" label="Tên nhân viên" rules={[{ required: true }]}>
                        <Input size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, type: 'email' }]}>
                        <Input size="large" className="rounded-xl" />
                    </Form.Item>
                    {!editingUser && <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{ required: true }, { min: 6, message: "Tối thiểu 6 ký tự" }]}>
                        <Input.Password size="large" className="rounded-xl" autoComplete="new-password" />
                    </Form.Item>}
                    <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl">
                            <Select.Option value="admin">Admin - Quản trị hệ thống</Select.Option>
                            <Select.Option value="manager">Quản lý sân - Quản lý sân và lịch</Select.Option>
                            <Select.Option value="user">User - Khách hàng</Select.Option>
                        </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block className="mt-2 !h-12 !text-base !font-bold">
                        {editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}
                    </Button>
                </Form>
            </Modal>
        </div>
    )
}
