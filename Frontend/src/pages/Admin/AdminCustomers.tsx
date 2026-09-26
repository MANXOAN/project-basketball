import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Table, Tooltip, message } from "antd";
import { Edit, Mail, Phone, Plus, Search, Trash2, UserRound, Users } from "lucide-react";
import { api } from "../../lib/api";

type Customer = { id: number; fullName: string; phone: string; email: string; note?: string; createdAt?: string };
type ApiError = { response?: { data?: { message?: string } } };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Customer>();
  const load = async () => { try { setCustomers((await api.get<Customer[]>("/customers")).data); } catch (e: unknown) { message.error((e as ApiError).response?.data?.message || "Không thể tải khách hàng"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const openForm = (customer?: Customer) => { setEditing(customer || null); form.setFieldsValue(customer || { fullName: "", phone: "", email: "", note: "" }); setOpen(true); };
  const save = async (values: Customer) => {
    try {
      if (editing) await api.put(`/customers/${editing.id}`, values); else await api.post("/customers", values);
      message.success(editing ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng"); setOpen(false); form.resetFields(); load();
    } catch (e: unknown) { message.error((e as ApiError).response?.data?.message || "Không thể lưu khách hàng"); }
  };
  const remove = async (id: number) => { try { await api.delete(`/customers/${id}`); message.success("Đã xóa khách hàng"); load(); } catch (e: unknown) { message.error((e as ApiError).response?.data?.message || "Không thể xóa khách hàng"); } };
  const filtered = customers.filter((item) => `${item.fullName} ${item.phone} ${item.email}`.toLowerCase().includes(query.toLowerCase()));
  const withEmail = customers.filter((item) => item.email).length;
  const columns = [
    {
      title: "Khách hàng", dataIndex: "fullName", width: 240,
      render: (value: string) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100">{(value || "?").trim().charAt(0).toUpperCase()}</span>
          <span className="truncate font-bold text-stone-900" title={value}>{value}</span>
        </div>
      ),
    },
    { title: "Liên hệ", width: 260, render: (_: unknown, item: Customer) => <div className="space-y-1 text-sm text-stone-600"><div className="flex items-center gap-2 tabular-nums"><Phone size={14} className="shrink-0 text-stone-400" aria-hidden="true" />{item.phone}</div>{item.email && <div className="flex min-w-0 items-center gap-2"><Mail size={14} className="shrink-0 text-stone-400" aria-hidden="true" /><span className="truncate">{item.email}</span></div>}</div> },
    { title: "Ghi chú", dataIndex: "note", ellipsis: true, render: (value: string) => value ? <span className="text-sm text-stone-600">{value}</span> : <span className="text-stone-400">—</span> },
    {
      title: "Thao tác", align: "right" as const, width: 110,
      render: (_: unknown, item: Customer) => (
        <div className="flex justify-end gap-1">
          <Tooltip title="Sửa"><Button aria-label={`Sửa ${item.fullName}`} type="text" icon={<Edit size={17} />} onClick={() => openForm(item)} /></Tooltip>
          <Popconfirm title="Xóa khách hàng này?" onConfirm={() => remove(item.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Tooltip title="Xóa"><Button aria-label={`Xóa ${item.fullName}`} danger type="text" icon={<Trash2 size={17} />} /></Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];
  return <div className="space-y-6 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 text-sm text-stone-600">Lưu và chăm sóc thông tin khách hàng đặt sân (mini CRM).</p>
      <Button type="primary" size="large" onClick={() => openForm()} icon={<Plus size={18} aria-hidden="true" />} className="self-start sm:self-auto">Thêm khách hàng</Button>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:max-w-xl sm:gap-4">
      {[{ label: "Tổng khách hàng", value: customers.length, icon: Users }, { label: "Có email liên hệ", value: withEmail, icon: Mail }].map((item) => { const Icon = item.icon; return (
        <div key={item.label} className="card flex items-center justify-between gap-3 !rounded-2xl p-3.5 sm:!rounded-3xl sm:p-5">
          <div><div className="text-2xl font-extrabold text-stone-950 tabular-nums">{item.value}</div><div className="mt-0.5 text-[11px] font-semibold leading-tight text-stone-500 sm:text-xs">{item.label}</div></div>
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 sm:grid"><Icon size={20} aria-hidden="true" /></span>
        </div>); })}
    </div>

    <section className="card overflow-hidden" aria-label="Danh sách khách hàng">
      <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="m-0 text-base font-extrabold text-stone-950">Danh sách khách hàng <span className="ml-1 text-sm font-semibold text-stone-500">({filtered.length})</span></h2>
        <Input aria-label="Tìm khách hàng" prefix={<Search size={16} className="text-stone-400" aria-hidden="true" />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, số điện thoại hoặc email" allowClear className="sm:!w-80" />
      </div>
      <Table loading={loading} dataSource={filtered} columns={columns} rowKey="id" className="modern-table" scroll={{ x: 760 }} pagination={{ pageSize: 10, hideOnSinglePage: true, className: "!px-5 sm:!px-6" }} locale={{ emptyText: <div className="py-12 text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400"><UserRound size={22} aria-hidden="true" /></span><div className="font-semibold text-stone-700">Chưa có khách hàng</div><div className="mt-1 text-sm text-stone-500">Thêm khách hàng đầu tiên để bắt đầu chăm sóc.</div></div> }} />
    </section>

    <Modal title={editing ? "Cập nhật khách hàng" : "Thêm khách hàng"} open={open} onCancel={() => setOpen(false)} footer={null}><Form form={form} layout="vertical" onFinish={save} className="mt-4" requiredMark={false}><Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}><Input size="large" /></Form.Item><Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}><Input size="large" inputMode="tel" /></Form.Item><Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input size="large" inputMode="email" /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item><Button htmlType="submit" type="primary" size="large" block>{editing ? "Lưu thay đổi" : "Thêm khách hàng"}</Button></Form></Modal>
  </div>;
}
