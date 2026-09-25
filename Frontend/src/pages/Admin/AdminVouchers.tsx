import { useState, useEffect } from "react";
import type { ThHTMLAttributes } from "react";
import type { Dayjs } from "dayjs";
import { Table, Button, Input, Modal, Form, Select, InputNumber, Switch, message, Spin, DatePicker, Popconfirm, Space } from "antd";
import { Ticket, Plus, Search, Percent, DollarSign, BarChart3, CheckCircle2, Archive, Edit, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { api, formatCurrency } from "../../lib/api";

interface Voucher {
    id: number;
    code: string;
    discount: number;
    type: 'percent' | 'fixed';
    limit: number;
    used: number;
    status: 'active' | 'inactive';
    startsAt?: string | null;
    endsAt?: string | null;
}

type VoucherFormValues = {
    code: string;
    discount: number;
    type: 'percent' | 'fixed';
    limit: number;
    status: boolean;
    validity?: [Dayjs, Dayjs];
};

export default function AdminVouchers() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState("");
    const voucherType = Form.useWatch("type", form);

    const fetchVouchers = async () => {
        try {
            const res = await api.get<Voucher[]>("/vouchers");
            setVouchers(res.data.reverse());
        } catch (error) {
            console.error("Lỗi lấy vouchers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const handleSave = async (values: VoucherFormValues) => {
        try {
            const payload = {
                code: values.code.trim().toUpperCase(),
                type: values.type,
                discount: values.discount,
                limit: values.limit,
                status: values.status ? 'active' : 'inactive',
                startsAt: values.validity?.[0]?.startOf("day").toISOString() || null,
                endsAt: values.validity?.[1]?.endOf("day").toISOString() || null,
            };
            if (editingVoucher) await api.put(`/vouchers/${editingVoucher.id}`, payload);
            else await api.post("/vouchers", payload);
            message.success(editingVoucher ? "Đã cập nhật voucher!" : "Tạo mã thành công!");
            setIsModalOpen(false);
            form.resetFields(); setEditingVoucher(null);
            fetchVouchers();
        } catch (error: unknown) {
            const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            message.error(errorMessage || "Không thể tạo voucher");
        }
    };

    const openModal = (voucher?: Voucher) => {
        setEditingVoucher(voucher || null);
        form.setFieldsValue(voucher ? { ...voucher, status: voucher.status === "active", validity: voucher.startsAt && voucher.endsAt ? [dayjs(voucher.startsAt), dayjs(voucher.endsAt)] : undefined } : { type: "percent", status: true });
        setIsModalOpen(true);
    };
    const removeVoucher = async (id: number) => {
        try { await api.delete(`/vouchers/${id}`); message.success("Đã xóa voucher"); fetchVouchers(); }
        catch (error: any) { message.error(error.response?.data?.message || "Không thể xóa voucher"); }
    };

    const toggleStatus = async (id: number, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await api.patch(`/vouchers/${id}`, { status: newStatus });
            message.success("Đã cập nhật trạng thái");
            fetchVouchers();
        } catch {
            message.error("Lỗi cập nhật");
        }
    };

    const columns = [
        {
            title: "Mã Khuyến Mãi",
            dataIndex: "code",
            render: (text: string) => <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md text-lg">{text}</span>
        },
        {
            title: "Loại giảm giá",
            dataIndex: "type",
            render: (type: string, record: Voucher) => (
                <div className="flex items-center font-bold text-gray-700 font-sans">
                    {type === "percent" ? <Percent size={14} className="mr-1 text-red-500" /> : <DollarSign size={14} className="mr-1 text-emerald-500" />}
                    {type === "percent" ? `Giảm ${record.discount}%` : `Giảm ${formatCurrency(record.discount)}`}
                </div>
            )
        },
        {
            title: "Đã dùng / Giới hạn",
            key: "usage",
            render: (_: unknown, r: Voucher) => (
                <div className="min-w-[130px]"><div className="flex justify-between text-xs font-bold text-gray-400 mb-1"><span>{r.used} lượt dùng</span><span>{r.limit}</span></div><div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-yellow-500" style={{ width: `${Math.min(100, (r.used / Math.max(r.limit, 1)) * 100)}%` }} /></div></div>
            )
        },
        {
            title: "Thời gian áp dụng",
            key: "validity",
            render: (_: unknown, r: Voucher) => (
                <div className="text-xs text-gray-500">
                    <div>{r.startsAt ? new Date(r.startsAt).toLocaleDateString("vi-VN") : "Dùng ngay"}</div>
                    <div className="mt-1 font-semibold text-gray-700">đến {r.endsAt ? new Date(r.endsAt).toLocaleDateString("vi-VN") : "không giới hạn"}</div>
                </div>
            )
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s: string, r: Voucher) => (
                <Switch
                    checked={s === 'active'}
                    onChange={() => toggleStatus(r.id, s)}
                    className={s === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}
                />
            )
        }
        , { title: "Thao tác", align: "right" as const, render: (_: unknown, voucher: Voucher) => <Space><Button type="text" aria-label={`Sửa voucher ${voucher.code}`} onClick={() => openModal(voucher)}><Edit size={18} /></Button><Popconfirm title={`Xóa voucher ${voucher.code}?`} onConfirm={() => removeVoucher(voucher.id)} okText="Xóa" cancelText="Hủy"><Button type="text" danger aria-label={`Xóa voucher ${voucher.code}`}><Trash2 size={18} /></Button></Popconfirm></Space> }
    ];

    if (loading) return <div className="flex justify-center py-40"><Spin size="large" /></div>;

    const filtered = vouchers.filter(v => v.code.toLowerCase().includes(searchText.toLowerCase()));

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400 mb-2"><Ticket size={14} /> Campaign studio</div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        Quản lý Mã Giảm Giá
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Tạo và quản lý các chiến dịch Voucher/Khuyến mãi</p>
                </div>
                <Button size="large" type="primary" onClick={() => openModal()} className="!bg-yellow-500 hover:!bg-yellow-400 !text-black border-0 shadow-lg shadow-yellow-500/20 font-bold px-6 flex items-center h-12 rounded-2xl transition-all hover:scale-105">
                    <Plus className="mr-2" size={20} /> Tạo mã mới
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[{ label: "Tổng mã", value: vouchers.length, icon: Ticket }, { label: "Đang hoạt động", value: vouchers.filter((v) => v.status === "active").length, icon: CheckCircle2 }, { label: "Tổng lượt dùng", value: vouchers.reduce((sum, v) => sum + (v.used || 0), 0), icon: BarChart3 }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-yellow-500/15 bg-zinc-900 p-5 flex items-center justify-between"><div><div className="text-2xl font-black text-white">{item.value}</div><div className="text-xs text-gray-500 mt-1">{item.label}</div></div><Icon className="text-yellow-400" size={24} /></div>; })}
            </div>
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-white/5 p-6 overflow-hidden">
                <Input
                    prefix={<Search size={18} className="text-gray-400 mr-2" />}
                    placeholder="Tìm mã code..."
                    size="large"
                    className="rounded-2xl mb-6 max-w-sm !bg-black !border-white/10 !text-white px-4 py-2 text-sm font-medium focus:ring-4 ring-yellow-500/10 transition-all border outline-none"
                    onChange={e => setSearchText(e.target.value)}
                />

                <Table
                    className="modern-table"
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    locale={{ emptyText: <div className="py-12 text-center text-gray-500"><Archive className="mx-auto mb-3 text-yellow-500" /><p>Chưa có mã khuyến mãi phù hợp</p></div> }}
                    components={{ header: { cell: (props: ThHTMLAttributes<HTMLTableCellElement>) => <th {...props} className="!bg-black/30 !text-gray-500 font-bold uppercase text-xs tracking-wider !border-b-white/10 py-4" /> } }}
                />
            </div>

            <Modal
                title={<div className="font-black text-xl flex items-center gap-2"><Ticket className="text-emerald-500" /> {editingVoucher ? "Cập nhật Voucher" : "Tạo Mã Giảm Giá (Voucher)"}</div>}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingVoucher(null); }}
                footer={null}
                width={500}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4" initialValues={{ type: 'percent', status: true }}>
                    <Form.Item name="code" label={<span className="font-semibold text-gray-700">Mã Code (VD: GIOVANG50)</span>} rules={[{ required: true, message: "Nhập mã voucher" }, { pattern: new RegExp("^[A-Za-z0-9_-]{3,32}" + String.fromCharCode(36)), message: "Dùng 3-32 ký tự chữ, số, - hoặc _" }]}>
                        <Input size="large" className="rounded-xl font-bold uppercase text-blue-600" />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="type" label={<span className="font-semibold text-gray-700">Loại giảm</span>}>
                            <Select size="large" className="rounded-xl">
                                <Select.Option value="percent">% Phần trăm</Select.Option>
                                <Select.Option value="fixed">VNĐ Tiền mặt</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="discount" label={<span className="font-semibold text-gray-700">Giá trị giảm</span>} rules={[{ required: true }]}>
                            <InputNumber size="large" className="w-full rounded-xl" min={1} max={voucherType === 'percent' ? 100 : undefined} />
                        </Form.Item>
                    </div>

                    <Form.Item name="limit" label={<span className="font-semibold text-gray-700">Số lượng sử dụng tối đa</span>} rules={[{ required: true }]}>
                        <InputNumber size="large" className="w-full rounded-xl" min={1} />
                    </Form.Item>

                    <Form.Item name="validity" label={<span className="font-semibold text-gray-700">Thời gian áp dụng (tùy chọn)</span>}>
                        <DatePicker.RangePicker size="large" className="w-full rounded-xl" format="DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item name="status" valuePropName="checked">
                        <Switch checkedChildren="Kích hoạt ngay" unCheckedChildren="Lưu nháp" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" size="large" block className="mt-4 bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-black tracking-wide shadow-lg shadow-emerald-500/30 rounded-xl">
                        {editingVoucher ? "LƯU THAY ĐỔI" : "TẠO MÃ"}
                    </Button>
                </Form>
            </Modal>
        </div>
    )
}
