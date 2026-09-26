import { useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Rate, Select, Tooltip, message } from "antd";
import { Edit, LayoutGrid, MapPin, Plus, Star, Trash2, Trophy } from "lucide-react";
import { api, formatCurrency, type Court, type Field } from "../../lib/api";

type FieldFormValues = Partial<Pick<Field, "name" | "address" | "priceFrom" | "rating" | "image" | "status">>;
type CourtFormValues = Partial<Pick<Court, "name" | "type" | "price" | "status" | "capacity" | "description" | "imageUrl">>;

const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export default function Facilities() {
  const [fields, setFields] = useState<Field[]>([]); const [courts, setCourts] = useState<Court[]>([]); const [loading, setLoading] = useState(true);
  const [fieldOpen, setFieldOpen] = useState(false); const [courtOpen, setCourtOpen] = useState(false); const [selected, setSelected] = useState<Field | null>(null); const [editingField, setEditingField] = useState<Field | null>(null); const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [fieldForm] = Form.useForm(); const [courtForm] = Form.useForm();
  const load = async () => { try { const [f, c] = await Promise.all([api.get<Field[]>("/fields"), api.get<Court[]>("/courts")]); setFields(f.data); setCourts(c.data); } catch { message.error("Không thể tải dữ liệu cơ sở"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const openField = (field?: Field) => { setEditingField(field || null); fieldForm.setFieldsValue(field || { priceFrom: 0, rating: 0, status: "active" }); setFieldOpen(true); };
  const saveField = async (values: FieldFormValues) => { try { if (editingField) await api.put(`/fields/${editingField.id}`, values); else await api.post("/fields", values); message.success("Đã lưu cơ sở"); setFieldOpen(false); load(); } catch (error: unknown) { message.error(apiErrorMessage(error, "Không thể lưu cơ sở")); } };
  const deleteField = async (id: number) => { try { await api.delete(`/fields/${id}`); message.success("Đã xóa cơ sở"); load(); } catch (error: unknown) { message.error(apiErrorMessage(error, "Không thể xóa cơ sở")); } };
  const openCourts = (field: Field) => { setSelected(field); };
  const openCourt = (court?: Court) => { setEditingCourt(court || null); courtForm.setFieldsValue(court || { fieldId: selected?.id, type: "Bóng rổ 5x5", status: "active", capacity: 10, price: 0 }); setCourtOpen(true); };
  const saveCourt = async (values: CourtFormValues) => { try { if (editingCourt) await api.put(`/courts/${editingCourt.id}`, values); else await api.post("/courts", { ...values, fieldId: selected?.id }); message.success("Đã lưu sân con"); setCourtOpen(false); load(); } catch (error: unknown) { message.error(apiErrorMessage(error, "Không thể lưu sân con")); } };
  const deleteCourt = async (id: number) => { try { await api.delete(`/courts/${id}`); message.success("Đã xóa sân con"); load(); } catch (error: unknown) { message.error(apiErrorMessage(error, "Không thể xóa sân con")); } };
  if (loading) return <div className="grid grid-cols-1 gap-5 pb-10 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Đang tải cơ sở">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[340px] !rounded-3xl" />)}</div>;
  const selectedCourts = courts.filter((court) => court.fieldId === selected?.id);
  const courtStatusChip = (status: string) => {
    const meta: Record<string, { label: string; cls: string }> = {
      active: { label: "Hoạt động", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
      maintenance: { label: "Bảo trì", cls: "bg-brand-50 text-brand-800 ring-brand-200" },
      inactive: { label: "Tạm dừng", cls: "bg-stone-100 text-stone-700 ring-stone-200" },
    };
    const item = meta[status] || { label: status, cls: "bg-stone-100 text-stone-700 ring-stone-200" };
    return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${item.cls}`}>{item.label}</span>;
  };
  return <div className="space-y-6 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 text-sm text-stone-600">Quản lý cụm sân, giá, hình ảnh và sân con của từng cơ sở bóng rổ.</p>
      <Button type="primary" size="large" onClick={() => openField()} icon={<Plus size={18} aria-hidden="true" />} className="self-start sm:self-auto">Thêm cơ sở</Button>
    </div>
    {fields.length === 0 ? (
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Trophy size={22} aria-hidden="true" /></span>
        <div className="font-bold text-stone-900">Chưa có cơ sở nào</div>
        <p className="m-0 mt-1 text-sm text-stone-500">Thêm cơ sở đầu tiên để bắt đầu nhận đặt sân.</p>
        <Button type="primary" className="mt-4" icon={<Plus size={16} aria-hidden="true" />} onClick={() => openField()}>Thêm cơ sở</Button>
      </div>
    ) : (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{fields.map((field, i) => {
      const courtCount = courts.filter((court) => court.fieldId === field.id).length;
      return (
      <article key={field.id} data-reveal style={{ "--reveal-index": i } as React.CSSProperties} className="card hover-lift group flex flex-col overflow-hidden">
        <div className="zoom-media relative h-44 bg-brand-50">
          {field.image ? <img src={field.image} alt={`Ảnh ${field.name}`} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100"><Trophy className="text-brand-500" size={42} aria-hidden="true" /></div>}
          <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-soft ${field.status === "active" ? "bg-white text-emerald-700" : "bg-white text-stone-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${field.status === "active" ? "bg-emerald-500" : "bg-stone-400"}`} aria-hidden="true" />{field.status === "active" ? "Hoạt động" : "Tạm dừng"}</span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <h2 className="m-0 line-clamp-2 text-lg font-extrabold text-stone-950">{field.name}</h2>
          <div className="flex gap-2 text-sm text-stone-600"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" /><span className="line-clamp-2">{field.address || "Chưa có địa chỉ"}</span></div>
          <div className="flex items-center justify-between border-t border-stone-100 pt-3"><span className="text-sm text-stone-500">Từ <strong className="text-base font-extrabold text-brand-700 tabular-nums">{formatCurrency(field.priceFrom)}</strong>/giờ</span><span className="flex items-center gap-1 text-sm font-bold text-stone-700"><Star size={15} className="fill-brand-500 text-brand-500" aria-hidden="true" />{Number(field.rating || 0).toFixed(1)}</span></div>
          <div className="mt-auto flex gap-2 pt-1">
            <Button className="flex-1" icon={<LayoutGrid size={16} aria-hidden="true" />} onClick={() => openCourts(field)}>Danh sách sân ({courtCount})</Button>
            <Tooltip title="Sửa"><Button aria-label={`Sửa ${field.name}`} icon={<Edit size={17} />} onClick={() => openField(field)} /></Tooltip>
            <Popconfirm title="Xóa cơ sở này?" onConfirm={() => deleteField(field.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}><Tooltip title="Xóa"><Button aria-label={`Xóa ${field.name}`} danger icon={<Trash2 size={17} />} /></Tooltip></Popconfirm>
          </div>
        </div>
      </article>);
    })}</div>
    )}
    <Modal title={editingField ? "Cập nhật cơ sở" : "Thêm cơ sở"} open={fieldOpen} onCancel={() => setFieldOpen(false)} footer={null}><Form form={fieldForm} layout="vertical" onFinish={saveField}><Form.Item name="name" label="Tên cơ sở" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="priceFrom" label="Giá từ (VNĐ/giờ)" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item><Form.Item name="rating" label="Đánh giá"><Rate allowHalf /></Form.Item><Form.Item name="image" label="Ảnh đại diện (URL)"><Input /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={[{ value: "active", label: "Hoạt động" }, { value: "inactive", label: "Tạm dừng" }]} /></Form.Item><Button type="primary" htmlType="submit" size="large" block>Lưu cơ sở</Button></Form></Modal>
    <Modal title={<span className="text-lg font-extrabold text-stone-950">Danh sách sân — {selected?.name || ""}</span>} open={Boolean(selected)} onCancel={() => setSelected(null)} footer={null} width={720}>
      <div className="mb-4 mt-2 flex items-center justify-between gap-3"><span className="text-sm text-stone-500">{selectedCourts.length} sân con</span><Button type="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => openCourt()}>Thêm sân con</Button></div>
      {selectedCourts.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center text-sm text-stone-500">Cơ sở này chưa có sân con.</div> : (
      <ul className="m-0 list-none space-y-2 p-0">{selectedCourts.map((court) => <li key={court.id} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-brand-300"><div className="min-w-0"><div className="truncate font-bold text-stone-900">{court.name}</div><div className="text-sm text-stone-500">{court.type} · <span className="font-semibold text-stone-700 tabular-nums">{formatCurrency(court.price)}</span>/giờ</div></div><div className="flex shrink-0 items-center gap-1">{courtStatusChip(court.status)}<Tooltip title="Sửa"><Button type="text" aria-label={`Sửa ${court.name}`} icon={<Edit size={17} />} onClick={() => openCourt(court)} /></Tooltip><Popconfirm title="Xóa sân con này?" onConfirm={() => deleteCourt(court.id)} okButtonProps={{ danger: true }}><Tooltip title="Xóa"><Button type="text" danger aria-label={`Xóa ${court.name}`} icon={<Trash2 size={17} />} /></Tooltip></Popconfirm></div></li>)}</ul>
      )}
    </Modal>
    <Modal title={editingCourt ? "Cập nhật sân con" : "Thêm sân con"} open={courtOpen} onCancel={() => setCourtOpen(false)} footer={null}><Form form={courtForm} layout="vertical" onFinish={saveCourt}><Form.Item name="name" label="Tên sân con" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="type" label="Loại sân"><Select options={[{ value: "Bóng rổ 5x5", label: "Bóng rổ 5x5" }, { value: "Bóng rổ 3x3", label: "Bóng rổ 3x3" }]} /></Form.Item><Form.Item name="price" label="Giá thuê/giờ" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={[{ value: "active", label: "Hoạt động" }, { value: "maintenance", label: "Bảo trì" }, { value: "inactive", label: "Tạm dừng" }]} /></Form.Item><Form.Item name="capacity" label="Sức chứa"><InputNumber min={1} className="w-full" /></Form.Item><Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item><Form.Item name="imageUrl" label="Ảnh sân con (URL)"><Input /></Form.Item><Button type="primary" htmlType="submit" size="large" block>Lưu sân con</Button></Form></Modal>
  </div>;
}
