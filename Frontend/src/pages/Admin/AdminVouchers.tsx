import { useState, useEffect } from "react";
import type { Dayjs } from "dayjs";
import { Table, Button, Input, Modal, Form, Select, InputNumber, Switch, message, DatePicker, Popconfirm, Tooltip } from "antd";
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
        catch (error: unknown) { message.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Không thể xóa voucher"); }
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
            title: "Mã khuyến mãi",
            dataIndex: "code",
            width: 200,
            render: (text: string) => <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-brand-800"><Ticket size={14} aria-hidden="true" />{text}</span>
        },
        {
            title: "Loại giảm giá",
            dataIndex: "type",
            width: 170,
            render: (type: string, record: Voucher) => (
                <div className="flex items-center gap-2 font-bold text-stone-800">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg ${type === "percent" ? "bg-brand-50 text-brand-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {type === "percent" ? <Percent size={14} aria-hidden="true" /> : <DollarSign size={14} aria-hidden="true" />}
                    </span>
                    {type === "percent" ? `Giảm ${record.discount}%` : `Giảm ${formatCurrency(record.discount)}`}
                </div>
            )
        },
        {
            title: "Đã dùng / Giới hạn",
            key: "usage",
            width: 190,
            render: (_: unknown, r: Voucher) => {
                const pct = Math.min(100, (r.used / Math.max(r.limit, 1)) * 100);
                return (
                    <div className="max-w-[170px]">
                        <div className="mb-1.5 flex justify-between text-xs font-semibold text-stone-600 tabular-nums"><span><strong className="text-stone-900">{r.used}</strong> lượt dùng</span><span>/ {r.limit}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
                    </div>
                );
            }
        },
        {
            title: "Thời gian áp dụng",
            key: "validity",
            width: 170,
            render: (_: unknown, r: Voucher) => (
                <div className="text-xs text-stone-500 tabular-nums">
                    <div>{r.startsAt ? new Date(r.startsAt).toLocaleDateString("vi-VN") : "Dùng ngay"}</div>
                    <div className="mt-1 font-semibold text-stone-700">đến {r.endsAt ? new Date(r.endsAt).toLocaleDateString("vi-VN") : "không giới hạn"}</div>
                </div>
            )
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            width: 170,
            render: (s: string, r: Voucher) => (
                <div className="flex items-center gap-2">
                    <Switch
                        checked={s === 'active'}
                        onChange={() => toggleStatus(r.id, s)}
                        aria-label={`Bật/tắt voucher ${r.code}`}
                        className={s === 'active' ? '!bg-emerald-600' : ''}
                    />
                    <span className={`text-xs font-bold ${s === 'active' ? 'text-emerald-700' : 'text-stone-500'}`}>{s === 'active' ? 'Đang chạy' : 'Tạm tắt'}</span>
                </div>
            )
        }
        , {
            title: "Thao tác", align: "right" as const, width: 110,
            render: (_: unknown, voucher: Voucher) => (
                <div className="flex justify-end gap-1">
                    <Tooltip title="Sửa"><Button type="text" aria-label={`Sửa voucher ${voucher.code}`} icon={<Edit size={17} />} onClick={() => openModal(voucher)} /></Tooltip>
                    <Popconfirm title={`Xóa voucher ${voucher.code}?`} onConfirm={() => removeVoucher(voucher.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Tooltip title="Xóa"><Button type="text" danger aria-label={`Xóa voucher ${voucher.code}`} icon={<Trash2 size={17} />} /></Tooltip>
                    </Popconfirm>
                </div>
            )
        }
    ];

    if (loading) return (
        <div className="space-y-6 pb-10" aria-busy="true" aria-label="Đang tải khuyến mãi">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[88px] !rounded-3xl" />)}</div>
            <div className="skeleton h-[420px] !rounded-3xl" />
        </div>
    );

    const filtered = vouchers.filter(v => v.code.toLowerCase().includes(searchText.toLowerCase()));

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-stone-600">Tạo và quản lý các chiến dịch voucher / khuyến mãi cho khách đặt sân.</p>
                <Button size="large" type="primary" onClick={() => openModal()} icon={<Plus size={18} aria-hidden="true" />} className="self-start sm:self-auto">
                    Tạo mã mới
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[{ label: "Tổng mã", value: vouchers.length, icon: Ticket }, { label: "Đang hoạt động", value: vouchers.filter((v) => v.status === "active").length, icon: CheckCircle2 }, { label: "Tổng lượt dùng", value: vouchers.reduce((sum, v) => sum + (v.used || 0), 0), icon: BarChart3 }].map((item) => { const Icon = item.icon; return (
                    <div key={item.label} className="card flex items-center justify-between gap-3 !rounded-2xl p-3.5 sm:!rounded-3xl sm:p-5">
                        <div><div className="text-2xl font-extrabold text-stone-950 tabular-nums">{item.value}</div><div className="mt-0.5 text-[11px] font-semibold leading-tight text-stone-500 sm:text-xs">{item.label}</div></div>
                        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 sm:grid"><Icon size={20} aria-hidden="true" /></span>
                    </div>); })}
            </div>

            <section className="card overflow-hidden" aria-label="Danh sách voucher">
                <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <h2 className="m-0 text-base font-extrabold text-stone-950">Danh sách mã <span className="ml-1 text-sm font-semibold text-stone-500">({filtered.length})</span></h2>
                    <Input
                        prefix={<Search size={16} className="text-stone-400" aria-hidden="true" />}
                        placeholder="Tìm mã code..."
                        aria-label="Tìm mã khuyến mãi"
                        allowClear
                        className="sm:!w-72"
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>

                <Table
                    className="modern-table"
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    scroll={{ x: 1010 }}
                    pagination={{ hideOnSinglePage: true, className: "!px-5 sm:!px-6" }}
                    locale={{ emptyText: <div className="py-12 text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Archive size={22} aria-hidden="true" /></span><div className="font-semibold text-stone-700">Chưa có mã khuyến mãi phù hợp</div><div className="mt-1 text-sm text-stone-500">Tạo mã mới hoặc thử từ khóa khác.</div></div> }}
                />
            </section>

            <Modal
                title={<div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100"><Ticket size={20} aria-hidden="true" /></span><span className="text-lg font-extrabold text-stone-950">{editingVoucher ? "Cập nhật voucher" : "Tạo mã giảm giá"}</span></div>}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingVoucher(null); }}
                footer={null}
                width={500}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4" initialValues={{ type: 'percent', status: true }}>
                    <Form.Item name="code" label={<span className="font-semibold text-stone-700">Mã Code (VD: GIOVANG50)</span>} rules={[{ required: true, message: "Nhập mã voucher" }, { pattern: new RegExp("^[A-Za-z0-9_-]{3,32}" + String.fromCharCode(36)), message: "Dùng 3-32 ký tự chữ, số, - hoặc _" }]}>
                        <Input size="large" className="rounded-xl font-mono font-bold uppercase text-brand-800" />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="type" label={<span className="font-semibold text-stone-700">Loại giảm</span>}>
                            <Select size="large" className="rounded-xl">
                                <Select.Option value="percent">% Phần trăm</Select.Option>
                                <Select.Option value="fixed">VNĐ Tiền mặt</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="discount" label={<span className="font-semibold text-stone-700">Giá trị giảm</span>} rules={[{ required: true }]}>
                            <InputNumber size="large" className="w-full rounded-xl" min={1} max={voucherType === 'percent' ? 100 : undefined} />
                        </Form.Item>
                    </div>

                    <Form.Item name="limit" label={<span className="font-semibold text-stone-700">Số lượng sử dụng tối đa</span>} rules={[{ required: true }]}>
                        <InputNumber size="large" className="w-full rounded-xl" min={1} />
                    </Form.Item>

                    <Form.Item name="validity" label={<span className="font-semibold text-stone-700">Thời gian áp dụng (tùy chọn)</span>}>
                        <DatePicker.RangePicker size="large" className="w-full rounded-xl" format="DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item name="status" valuePropName="checked">
                        <Switch checkedChildren="Kích hoạt ngay" unCheckedChildren="Lưu nháp" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" size="large" block className="mt-2 !h-12 !text-base !font-bold">
                        {editingVoucher ? "Lưu thay đổi" : "Tạo mã"}
                    </Button>
                </Form>
            </Modal>
        </div>
    )
}
