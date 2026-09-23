import { Table, Button, Space, Popconfirm, message, Modal, Form, Input, InputNumber, Select, Spin, Tag } from "antd";
import { CopyPlus, Edit, Trash2, MapPin, Activity, CheckCircle2, Layers3, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { api, type Court as ApiCourt, type Field, formatCurrency } from "../../lib/api";

type Court = ApiCourt;

export default function Courts() {
    const [data, setData] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    const [form] = Form.useForm();

    const fetchCourts = async () => {
        try {
            const res2 = await api.get<Court[]>("/courts");
            setData(res2.data);
        } catch (error) {
            message.error("Không thể tải dữ liệu sân.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourts();
        api.get<Field[]>("/fields").then((res) => setFields(res.data)).catch(() => message.error("Không thể tải danh sách cơ sở."));
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/courts/${id}`);
            await fetchCourts();
            setData(data.filter(item => item.id !== id));
            message.success("Xoá sân thành công");
        } catch (error) {
            message.error("Xoá sân thất bại");
        }
    };

    const handleOpenModal = (court?: Court) => {
        if (court) {
            setEditingCourt(court);
            form.setFieldsValue(court);
        } else {
            setEditingCourt(null);
            form.resetFields();
            form.setFieldsValue({ status: "active", type: "Bóng rổ 5x5", capacity: 10, fieldId: fields[0]?.id });
        }
        setIsModalOpen(true);
    };

    const handleSubmitForm = async (values: any) => {
        try {
            const isDuplicate = data.some(
                (c) =>
                    c.name.trim().toLowerCase() === values.name.trim().toLowerCase() &&
                    c.id !== editingCourt?.id
            );
    
            if (isDuplicate) {
                message.error("Tên sân/cơ sở đã tồn tại, vui lòng chọn tên khác!");
                return;
            }
    
            // Ép kiểu chuẩn hóa payload gửi lên backend
            const payload = {
                ...values,
                price: Number(values.price) || 0,
                type: values.type,
                fieldId: Number(values.fieldId),
                capacity: Number(values.capacity) || 10,
            };
    
            if (editingCourt) {
                const res = await api.put(`/courts/${editingCourt.id}`, payload);
                setData(data.map(item => item.id === editingCourt.id ? res.data : item));
                message.success("Cập nhật sân thành công!");
            } else {
                const res = await api.post(`/courts`, payload);
                setData([...data, res.data]);
                message.success("Thêm sân mới thành công!");
            }
            setIsModalOpen(false);
        } catch (error) {
            message.error("Lưu thông tin thất bại!");
        }
    };

    const columns = [
        {
            title: "Tên Sân Bãi",
            dataIndex: "name",
            key: "name",
            render: (text: string) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <MapPin size={18} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-base">{text}</div>
                        <div className="text-xs text-gray-500">ID: {text ? "Đang vận hành" : "Chưa đặt tên"}</div>
                    </div>
                </div>
            )
        },
        {
            title: "Giá Thuê (VNĐ)",
            dataIndex: "price",
            key: "price",
            render: (value: number) => <span className="font-bold text-gray-700">{formatCurrency(value)}</span>
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => status === 'active'
                ? <Tag color="success" className="rounded-full px-3 py-1 font-bold border-0 bg-green-50 text-green-600 flex items-center w-max gap-1"><CheckCircle2 size={14} /> Hoạt động</Tag>
                : <Tag color="warning" className="rounded-full px-3 py-1 font-bold border-0 bg-orange-50 text-orange-600 flex items-center w-max gap-1"><Activity size={14} /> Bảo trì</Tag>
        },
        {
            title: "Hành động",
            key: "action",
            align: 'right' as const,
            render: (_: any, record: Court) => (
                <Space size="small">
                    <Button type="text" size="middle" className="text-blue-600 hover:bg-blue-50 font-medium rounded-xl flex items-center justify-center p-2" onClick={() => handleOpenModal(record)}>
                        <Edit size={18} />
                    </Button>
                    <Popconfirm title="Chắc chắn xoá sân này?" onConfirm={() => handleDelete(record.id)} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}>
                        <Button danger type="text" size="middle" className="hover:bg-red-50 rounded-xl flex items-center justify-center p-2">
                            <Trash2 size={18} />
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                <div>
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400 mb-2"><Layers3 size={14} /> Venue operations</div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Quản lý Sân Bóng</h1>
                    <p className="text-gray-500 mt-2 font-medium">Thêm, sửa, xoá và cập nhật trạng thái các sân bóng</p>
                </div>
                <Button
                    type="primary"
                    size="large"
                    className="!bg-yellow-500 hover:!bg-yellow-400 shadow-lg shadow-yellow-500/20 !text-black font-bold rounded-2xl h-12 px-6 flex items-center transition-all hover:scale-105 !border-0 gap-2"
                    onClick={() => handleOpenModal()}
                >
                    <CopyPlus size={20} /> Tạo sân mới
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[{ label: "Tổng số sân", value: data.length, icon: MapPin }, { label: "Đang hoạt động", value: data.filter((c) => c.status === "active").length, icon: CheckCircle2 }, { label: "Đang bảo trì", value: data.filter((c) => c.status !== "active").length, icon: Wrench }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-yellow-500/15 bg-zinc-900 p-5 flex items-center justify-between"><div><div className="text-2xl font-black text-white">{item.value}</div><div className="text-xs text-gray-500 mt-1">{item.label}</div></div><Icon className="text-yellow-400" size={24} /></div>; })}
            </div>
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-white/5 p-6 overflow-hidden">
                <Table
                    className="modern-table"
                    dataSource={data}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10, className: "mt-6" }}
                    components={{
                        header: { cell: (props: any) => <th {...props} className="!bg-black/30 !text-gray-500 font-bold !border-b-white/10 py-4 uppercase text-xs tracking-wider" /> }
                    }}
                />
            </div>

            <Modal
                title={<span className="font-bold text-xl text-gray-800 tracking-tight">{editingCourt ? "Chỉnh sửa sân bóng" : "Thêm sân mới"}</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                className="rounded-3xl overflow-hidden"
                width={500}
            >
                <Form layout="vertical" form={form} onFinish={handleSubmitForm} className="mt-8" requiredMark={false}>
                    <Form.Item label={<span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Tên Sân Bãi</span>} name="name" rules={[{ required: true, message: "Vui lòng nhập tên" }]}>
                        <Input placeholder="VD: Sân Bóng Rổ số 1..." size="large" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item label={<span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Cơ sở</span>} name="fieldId" rules={[{ required: true, message: "Chọn cơ sở" }]}>
                        <Select size="large" className="rounded-xl" placeholder="Chọn cơ sở" options={fields.map((field) => ({ value: field.id, label: field.name }))} />
                    </Form.Item>

                    <Form.Item label={<span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Loại Sân</span>} name="type" rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl" options={[
                            { value: 'Bóng rổ 5x5', label: 'Sân Bóng Rổ 5x5 - Tiêu chuẩn' },
                            { value: 'Bóng rổ 3x3', label: 'Sân Bóng Rổ 3x3 - Nửa sân' },
                        ]} />
                    </Form.Item>

                    <Form.Item label={<span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Giá thuê / Giờ (VNĐ)</span>} name="price" rules={[{ required: true, message: "Nhập giá tiền" }]}>
                        <InputNumber size="large" className="w-full rounded-xl font-bold" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>

                    <Form.Item label={<span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Trạng thái hiện tại</span>} name="status" rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl font-medium" options={[
                            { value: 'active', label: 'Đang hoạt động (Trống)' },
                            { value: 'maintenance', label: 'Bảo trì (Tạm khoá)' },
                        ]} />
                    </Form.Item>

                    <Form.Item label={<span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Sức chứa</span>} name="capacity" rules={[{ required: true, message: "Nhập sức chứa" }]}>
                        <InputNumber size="large" min={1} className="w-full rounded-xl" />
                    </Form.Item>

                    <div className="flex gap-3 mt-8">
                        <Button size="large" className="flex-1 rounded-2xl font-bold h-12 text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100" onClick={() => setIsModalOpen(false)}>
                            Huỷ bỏ
                        </Button>
                        <Button type="primary" htmlType="submit" size="large" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 rounded-2xl font-bold h-12 border-0">
                            {editingCourt ? "Lưu thay đổi" : "Tạo sân mới"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
