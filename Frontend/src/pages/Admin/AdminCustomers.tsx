import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from "antd";
import { Edit, Mail, Phone, Plus, Search, Trash2, UserRound, Users } from "lucide-react";
import { api } from "../../lib/api";

type Customer = { id: number; fullName: string; phone: string; email: string; note?: string; createdAt?: string };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Customer>();
  const load = async () => { try { setCustomers((await api.get<Customer[]>("/customers")).data); } catch (e: any) { message.error(e.response?.data?.message || "Không thể tải khách hàng"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const openForm = (customer?: Customer) => { setEditing(customer || null); form.setFieldsValue(customer || { fullName: "", phone: "", email: "", note: "" }); setOpen(true); };
  const save = async (values: Customer) => {
    try {
      if (editing) await api.put(`/customers/${editing.id}`, values); else await api.post("/customers", values);
      message.success(editing ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng"); setOpen(false); form.resetFields(); load();
    } catch (e: any) { message.error(e.response?.data?.message || "Không thể lưu khách hàng"); }
  };
  const remove = async (id: number) => { try { await api.delete(`/customers/${id}`); message.success("Đã xóa khách hàng"); load(); } catch (e: any) { message.error(e.response?.data?.message || "Không thể xóa khách hàng"); } };
  const filtered = customers.filter((item) => `${item.fullName} ${item.phone} ${item.email}`.toLowerCase().includes(query.toLowerCase()));
  const columns = [
    { title: "Khách hàng", dataIndex: "fullName", render: (value: string) => <span className="font-bold text-gray-800">{value}</span> },
    { title: "Liên hệ", render: (_: unknown, item: Customer) => <div className="space-y-1 text-sm text-gray-600"><div className="flex items-center gap-2"><Phone size={14} />{item.phone}</div>{item.email && <div className="flex items-center gap-2"><Mail size={14} />{item.email}</div>}</div> },
    { title: "Ghi chú", dataIndex: "note", render: (value: string) => value || <span className="text-gray-400">—</span> },
    { title: "Thao tác", align: "right" as const, render: (_: unknown, item: Customer) => <Space><Button aria-label={`Sửa ${item.fullName}`} type="text" onClick={() => openForm(item)}><Edit size={18} /></Button><Popconfirm title="Xóa khách hàng này?" onConfirm={() => remove(item.id)} okText="Xóa" cancelText="Hủy"><Button aria-label={`Xóa ${item.fullName}`} danger type="text"><Trash2 size={18} /></Button></Popconfirm></Space> },
  ];
  return <div className="animate-in fade-in duration-500 pb-10">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400"><Users size={14} /> Mini CRM</div><h1 className="text-3xl font-black text-white">Quản lý khách hàng</h1><p className="mt-2 font-medium text-gray-500">Lưu và chăm sóc thông tin khách hàng đặt sân.</p></div><Button type="primary" size="large" onClick={() => openForm()} className="!h-12 !border-0 !bg-yellow-500 !px-6 !font-bold !text-black"><Plus size={18} /> Thêm khách hàng</Button></div>
    <div className="mb-6 rounded-2xl border border-yellow-500/15 bg-zinc-900 p-5"><div className="text-2xl font-black text-white">{customers.length}</div><div className="text-xs text-gray-500">Tổng khách hàng CRM</div></div>
    <div className="rounded-3xl border border-white/5 bg-zinc-900 p-6"><Input aria-label="Tìm khách hàng" prefix={<Search size={18} />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, số điện thoại hoặc email" className="mb-6 max-w-md" /><Table loading={loading} dataSource={filtered} columns={columns} rowKey="id" className="modern-table" locale={{ emptyText: <div className="py-10 text-gray-400"><UserRound className="mx-auto mb-2" />Chưa có khách hàng</div> }} /></div>
    <Modal title={editing ? "Cập nhật khách hàng" : "Thêm khách hàng"} open={open} onCancel={() => setOpen(false)} footer={null}><Form form={form} layout="vertical" onFinish={save}><Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}><Input /></Form.Item><Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item><Button htmlType="submit" type="primary" block>{editing ? "Lưu thay đổi" : "Thêm khách hàng"}</Button></Form></Modal>
  </div>;
}
