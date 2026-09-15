import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Select, message, Spin, Tag, Input } from "antd";
import { Users, Shield, ShieldCheck, Mail, Lock, Plus } from "lucide-react";
import { api } from "../../lib/api";

export default function AdminEmployees() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        try {
            const res = await api.get("/users");
            // only show admins and staff, or show everyone with role selection
            setUsers(res.data.filter((u: any) => u.role !== 'user'));
        } catch {
            message.error("Lỗi lấy danh sách");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (values: any) => {
        try {
            const payload = {
                name: values.fullName || values.name,
                fullName: values.fullName || values.name,
                email: values.email,
                password: values.password || "12345678",
                phone: values.phone || "0900000000",
                role: values.role || "staff",
            };
    
            await api.post("/register", payload);
    
            message.success("Tạo nhân viên thành công!");
            setIsModalOpen(false);
            form.resetFields();
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

    const changeRole = async (id: number, newRole: string) => {
        try {
            await api.patch(`/users/${id}`, { role: newRole });
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
                        { value: 'admin', label: <span className="text-red-600 flex items-center"><ShieldCheck size={14} className="mr-1" /> Quản lý (Admin)</span> },
                        { value: 'accountant', label: <span className="text-blue-600 flex items-center"><Lock size={14} className="mr-1" /> Kế toán</span> },
                        { value: 'receptionist', label: <span className="text-emerald-600 flex items-center"><Users size={14} className="mr-1" /> Lễ tân (POS)</span> }
                    ]}
                />
            )
        },
        {
            title: "Quyền hạn",
            dataIndex: "role",
            render: (r: string) => {
                if (r === 'admin') return <Tag color="red">Toàn quyền</Tag>;
                if (r === 'accountant') return <Tag color="blue">Xem Báo Cáo, Không Đổi Lịch</Tag>;
                if (r === 'receptionist') return <Tag color="green">Chỉ Tạo Đơn, Cập Nhật Lịch</Tag>;
                return <Tag>Khách hàng</Tag>;
            }
        }
    ];

    if (loading) return <div className="flex justify-center py-40"><Spin size="large" /></div>;

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
                        Phân Quyền Nhân Sự (RBAC)
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Bảo mật hệ thống, cấp quyền truy cập theo từng chức vụ</p>
                </div>
                <Button size="large" type="primary" onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 font-bold px-6 border-0 shadow-lg shadow-cyan-500/30 flex items-center h-12 rounded-2xl transition-all hover:scale-105 hover:-translate-y-0.5">
                    <Plus className="mr-2" size={20} /> Thêm nhân sự
                </Button>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 overflow-hidden">
                <Table
                    className="modern-table mt-2"
                    dataSource={users}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    components={{ header: { cell: (props: any) => <th {...props} className="bg-gray-50/50 text-gray-500 font-bold uppercase text-xs tracking-wider border-b border-gray-100 py-4" /> } }}
                />
            </div>

            <Modal
                title={<div className="font-black text-xl flex items-center gap-2"><Shield className="text-blue-500" /> Thêm Nhân Sự Mới</div>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} className="mt-4" initialValues={{ role: 'receptionist' }}>
                    <Form.Item name="fullName" label="Tên nhân viên" rules={[{ required: true }]}>
                        <Input size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, type: 'email' }]}>
                        <Input size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="role" label={<span className="font-semibold text-gray-700 mt-2">Vai trò</span>} rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl">
                            <Select.Option value="admin">Quản lý (Admin) - Toàn quyền</Select.Option>
                            <Select.Option value="accountant">Kế toán - Chỉ xem báo cáo</Select.Option>
                            <Select.Option value="receptionist">Lễ tân - Chỉ trực quầy POS</Select.Option>
                        </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 border-0 shadow-lg shadow-cyan-500/30 h-12 text-lg font-black rounded-2xl">
                        TẠO TÀI KHOẢN
                    </Button>
                </Form>
            </Modal>
        </div>
    )
}
