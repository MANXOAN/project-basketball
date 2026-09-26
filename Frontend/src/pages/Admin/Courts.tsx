import { Table, Button, Popconfirm, message, Modal, Form, Input, InputNumber, Select, Tooltip } from "antd";
import { CopyPlus, Edit, Trash2, MapPin, CheckCircle2, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { api, type Court as ApiCourt, type Field, formatCurrency } from "../../lib/api";

type Court = ApiCourt;
type CourtFormValues = Pick<Court, "name" | "fieldId" | "type" | "price" | "status" | "capacity"> & Partial<Pick<Court, "description" | "imageUrl">>;
type FieldFormValues = Pick<Field, "name" | "address" | "priceFrom" | "status"> & Partial<Pick<Field, "city" | "phone" | "openTime" | "closeTime" | "description" | "image" | "rating">>;

export default function Courts() {
    const [data, setData] = useState<Court[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    const [form] = Form.useForm();
    const [fieldForm] = Form.useForm<FieldFormValues>();
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<Field | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [courtResponse, fieldResponse] = await Promise.all([
                api.get<Court[]>("/courts"),
                api.get<Field[]>("/fields"),
            ]);
            setData(courtResponse.data);
            setFields(fieldResponse.data);
        } catch {
            message.error("Không thể tải dữ liệu cơ sở và sân.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenFieldModal = (field?: Field) => {
        setEditingField(field || null);
        fieldForm.resetFields();
        fieldForm.setFieldsValue(field || {
            name: "",
            address: "",
            priceFrom: 0,
            openTime: "06:00",
            closeTime: "22:00",
            rating: 0,
            status: "active",
        });
        setIsFieldModalOpen(true);
    };

    const handleSubmitField = async (values: FieldFormValues) => {
        try {
            const payload = {
                ...values,
                priceFrom: Number(values.priceFrom) || 0,
                rating: Number(values.rating) || 0,
            };
            if (editingField) {
                await api.put(`/fields/${editingField.id}`, payload);
                message.success("Cập nhật cơ sở thành công!");
            } else {
                await api.post("/fields", payload);
                message.success("Tạo cơ sở thành công!");
            }
            setIsFieldModalOpen(false);
            await fetchData();
        } catch (error) {
            const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
            message.error(errorMessage || "Không thể lưu cơ sở.");
        }
    };

    const handleDeleteField = async (id: number) => {
        try {
            await api.delete(`/fields/${id}`);
            message.success("Xóa cơ sở thành công.");
            await fetchData();
        } catch (error) {
            const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
            message.error(errorMessage || "Không thể xóa cơ sở.");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/courts/${id}`);
            await fetchData();
            message.success("Xoá sân thành công");
        } catch {
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

    const handleSubmitForm = async (values: CourtFormValues) => {
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
        } catch {
            message.error("Lưu thông tin thất bại!");
        }
    };

    const fieldName = (id: number) => fields.find((field) => field.id === id)?.name;

    const fieldColumns = [
        {
            title: "Cơ sở sân",
            dataIndex: "name",
            key: "name",
            render: (name: string, field: Field) => (
                <div className="min-w-0">
                    <div className="truncate font-bold text-stone-900" title={name}>{name}</div>
                    <div className="truncate text-xs text-stone-500" title={field.address}>{field.address || "Chưa có địa chỉ"}</div>
                </div>
            ),
        },
        {
            title: "Giờ hoạt động",
            key: "hours",
            width: 160,
            render: (_: unknown, field: Field) => <span className="whitespace-nowrap text-sm text-stone-600">{field.openTime || "06:00"}–{field.closeTime || "22:00"}</span>,
        },
        {
            title: "Sân con",
            key: "courtCount",
            width: 100,
            align: "center" as const,
            render: (_: unknown, field: Field) => <span className="font-bold tabular-nums text-stone-800">{data.filter((court) => court.fieldId === field.id).length}</span>,
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 140,
            render: (status: string) => status === "active"
                ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200"><CheckCircle2 size={13} aria-hidden="true" /> Hoạt động</span>
                : <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600 ring-1 ring-inset ring-stone-200">Tạm dừng</span>,
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 100,
            align: "right" as const,
            render: (_: unknown, field: Field) => (
                <div className="flex justify-end gap-1">
                    <Tooltip title="Sửa cơ sở"><Button type="text" aria-label={`Sửa ${field.name}`} icon={<Edit size={17} />} onClick={() => handleOpenFieldModal(field)} /></Tooltip>
                    <Popconfirm title={`Xóa cơ sở ${field.name}?`} description="Các sân con cũng sẽ bị xóa nếu không còn booking đang hoạt động." onConfirm={() => handleDeleteField(field.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Tooltip title="Xóa cơ sở"><Button danger type="text" aria-label={`Xóa ${field.name}`} icon={<Trash2 size={17} />} /></Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const columns = [
        {
            title: "Tên sân",
            dataIndex: "name",
            key: "name",
            width: 300,
            render: (text: string, record: Court) => (
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                        <MapPin size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <div className="truncate font-bold text-stone-900" title={text}>{text}</div>
                        <div className="truncate text-xs text-stone-500">{fieldName(record.fieldId) || (text ? "Đang vận hành" : "Chưa đặt tên")}</div>
                    </div>
                </div>
            )
        },
        {
            title: "Loại sân",
            dataIndex: "type",
            key: "type",
            width: 150,
            render: (value: string) => <span className="text-sm font-semibold text-stone-700">{value || "—"}</span>
        },
        {
            title: "Giá thuê / giờ",
            dataIndex: "price",
            key: "price",
            width: 150,
            align: "right" as const,
            render: (value: number) => <span className="font-extrabold text-stone-900 tabular-nums">{formatCurrency(value)}</span>
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 150,
            render: (status: string) => status === 'active'
                ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200"><CheckCircle2 size={13} aria-hidden="true" /> Hoạt động</span>
                : <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800 ring-1 ring-inset ring-brand-200"><Wrench size={13} aria-hidden="true" /> Bảo trì</span>
        },
        {
            title: "Thao tác",
            key: "action",
            width: 110,
            align: 'right' as const,
            render: (_: unknown, record: Court) => (
                <div className="flex justify-end gap-1">
                    <Tooltip title="Sửa"><Button type="text" aria-label={`Sửa ${record.name}`} icon={<Edit size={17} />} onClick={() => handleOpenModal(record)} /></Tooltip>
                    <Popconfirm title="Chắc chắn xoá sân này?" onConfirm={() => handleDelete(record.id)} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}>
                        <Tooltip title="Xoá"><Button danger type="text" aria-label={`Xoá ${record.name}`} icon={<Trash2 size={17} />} /></Tooltip>
                    </Popconfirm>
                </div>
            )
        }
    ];

    if (loading) {
        return (
            <div className="space-y-6 pb-10" aria-busy="true" aria-label="Đang tải sân">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[88px] !rounded-3xl" />)}</div>
                <div className="skeleton h-[420px] !rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-stone-600">Quản lý cơ sở sân cha và toàn bộ sân con trực thuộc.</p>
                <div className="flex flex-wrap gap-2">
                    <Button size="large" icon={<MapPin size={18} aria-hidden="true" />} onClick={() => handleOpenFieldModal()}>
                        Thêm cơ sở
                    </Button>
                    <Button type="primary" size="large" icon={<CopyPlus size={18} aria-hidden="true" />} onClick={() => handleOpenModal()}>
                        Thêm sân con
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[{ label: "Tổng số sân", value: data.length, icon: MapPin }, { label: "Đang hoạt động", value: data.filter((c) => c.status === "active").length, icon: CheckCircle2 }, { label: "Đang bảo trì", value: data.filter((c) => c.status !== "active").length, icon: Wrench }].map((item) => { const Icon = item.icon; return (
                    <div key={item.label} className="card flex items-center justify-between gap-3 !rounded-2xl p-3.5 sm:!rounded-3xl sm:p-5">
                        <div><div className="text-2xl font-extrabold text-stone-950 tabular-nums">{item.value}</div><div className="mt-0.5 text-[11px] font-semibold leading-tight text-stone-500 sm:text-xs">{item.label}</div></div>
                        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 sm:grid"><Icon size={20} aria-hidden="true" /></span>
                    </div>); })}
            </div>

            <section className="card overflow-hidden" aria-label="Danh sách cơ sở sân cha">
                <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                    <h2 className="m-0 text-base font-extrabold text-stone-950">Cơ sở sân cha <span className="ml-1 text-sm font-semibold text-stone-500">({fields.length})</span></h2>
                </div>
                <Table
                    className="modern-table"
                    dataSource={fields}
                    columns={fieldColumns}
                    rowKey="id"
                    scroll={{ x: 760 }}
                    pagination={{ pageSize: 6, hideOnSinglePage: true, className: "!px-5 sm:!px-6" }}
                    locale={{ emptyText: <div className="py-10 text-center"><div className="font-semibold text-stone-700">Chưa có cơ sở sân</div><div className="mt-1 text-sm text-stone-500">Thêm cơ sở để tạo sân con trực thuộc.</div></div> }}
                />
            </section>

            <section className="card overflow-hidden" aria-label="Danh sách sân con">
                <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                    <h2 className="m-0 text-base font-extrabold text-stone-950">Danh sách sân con <span className="ml-1 text-sm font-semibold text-stone-500">({data.length})</span></h2>
                </div>
                <Table
                    className="modern-table"
                    dataSource={data}
                    columns={columns}
                    rowKey="id"
                    scroll={{ x: 860 }}
                    pagination={{ pageSize: 10, hideOnSinglePage: true, className: "!px-5 sm:!px-6" }}
                    locale={{ emptyText: <div className="py-12 text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MapPin size={22} aria-hidden="true" /></span><div className="font-semibold text-stone-700">Chưa có sân con</div><div className="mt-1 text-sm text-stone-500">Tạo sân con và chọn cơ sở sân cha tương ứng.</div></div> }}
                />
            </section>

            <Modal
                title={<span className="text-lg font-extrabold tracking-tight text-stone-950">{editingField ? "Chỉnh sửa cơ sở sân" : "Tạo cơ sở sân cha"}</span>}
                open={isFieldModalOpen}
                onCancel={() => setIsFieldModalOpen(false)}
                footer={null}
                className="rounded-3xl overflow-hidden"
                width={560}
            >
                <Form layout="vertical" form={fieldForm} onFinish={handleSubmitField} className="mt-5" requiredMark={false}>
                    <Form.Item label="Tên cơ sở" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên cơ sở" }]}>
                        <Input size="large" placeholder="Ví dụ: GoldenState Arena" />
                    </Form.Item>
                    <Form.Item label="Địa chỉ" name="address" rules={[{ required: true, whitespace: true, message: "Nhập địa chỉ cơ sở" }]}>
                        <Input size="large" />
                    </Form.Item>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Form.Item label="Thành phố" name="city"><Input /></Form.Item>
                        <Form.Item label="Số điện thoại" name="phone"><Input inputMode="tel" /></Form.Item>
                        <Form.Item label="Mở cửa" name="openTime"><Input type="time" /></Form.Item>
                        <Form.Item label="Đóng cửa" name="closeTime"><Input type="time" /></Form.Item>
                        <Form.Item label="Giá từ (VNĐ/giờ)" name="priceFrom" rules={[{ required: true, message: "Nhập giá tham khảo" }]}>
                            <InputNumber min={0} className="w-full" />
                        </Form.Item>
                        <Form.Item label="Đánh giá (0–5)" name="rating">
                            <InputNumber min={0} max={5} step={0.5} className="w-full" />
                        </Form.Item>
                    </div>
                    <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
                        <Select options={[{ value: "active", label: "Hoạt động" }, { value: "inactive", label: "Tạm dừng" }]} />
                    </Form.Item>
                    <Form.Item label="Mô tả" name="description"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item label="Ảnh đại diện (URL)" name="image"><Input placeholder="https://..." /></Form.Item>
                    <div className="flex gap-3">
                        <Button size="large" className="flex-1" onClick={() => setIsFieldModalOpen(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" size="large" className="flex-1">{editingField ? "Lưu cơ sở" : "Tạo cơ sở"}</Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={<span className="text-lg font-extrabold tracking-tight text-stone-950">{editingCourt ? "Chỉnh sửa sân bóng" : "Thêm sân mới"}</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                className="rounded-3xl overflow-hidden"
                width={500}
            >
                <Form layout="vertical" form={form} onFinish={handleSubmitForm} className="mt-5" requiredMark={false}>
                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Tên Sân Bãi</span>} name="name" rules={[{ required: true, message: "Vui lòng nhập tên" }]}>
                        <Input placeholder="VD: Sân Bóng Rổ số 1..." size="large" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Cơ sở</span>} name="fieldId" rules={[{ required: true, message: "Chọn cơ sở" }]}>
                        <Select size="large" className="rounded-xl" placeholder="Chọn cơ sở" options={fields.map((field) => ({ value: field.id, label: field.name }))} />
                    </Form.Item>

                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Loại Sân</span>} name="type" rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl" options={[
                            { value: 'Bóng rổ 5x5', label: 'Sân Bóng Rổ 5x5 - Tiêu chuẩn' },
                            { value: 'Bóng rổ 3x3', label: 'Sân Bóng Rổ 3x3 - Nửa sân' },
                        ]} />
                    </Form.Item>

                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Giá thuê / Giờ (VNĐ)</span>} name="price" rules={[{ required: true, message: "Nhập giá tiền" }]}>
                        <InputNumber size="large" className="w-full rounded-xl font-bold" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>

                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Trạng thái hiện tại</span>} name="status" rules={[{ required: true }]}>
                        <Select size="large" className="rounded-xl font-medium" options={[
                            { value: 'active', label: 'Đang hoạt động (Trống)' },
                            { value: 'maintenance', label: 'Bảo trì (Tạm khoá)' },
                        ]} />
                    </Form.Item>

                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Sức chứa</span>} name="capacity" rules={[{ required: true, message: "Nhập sức chứa" }]}>
                        <InputNumber size="large" min={1} className="w-full rounded-xl" />
                    </Form.Item>

                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Mô tả</span>} name="description">
                        <Input.TextArea rows={3} placeholder="Mô tả mặt sân, ánh sáng, tiện ích..." />
                    </Form.Item>
                    <Form.Item label={<span className="text-sm font-semibold text-stone-700">Ảnh sân (URL)</span>} name="imageUrl">
                        <Input placeholder="https://..." />
                    </Form.Item>

                    <div className="mt-6 flex gap-3">
                        <Button size="large" className="flex-1" onClick={() => setIsModalOpen(false)}>
                            Huỷ bỏ
                        </Button>
                        <Button type="primary" htmlType="submit" size="large" className="flex-1">
                            {editingCourt ? "Lưu thay đổi" : "Tạo sân mới"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
