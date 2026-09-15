import React, { useEffect, useState } from "react";
import { Table, Select, message, Spin, Button, Input, Modal, Form, DatePicker, TimePicker, InputNumber, Divider } from "antd";
import { QrCode, Filter, CheckCircle2, CreditCard, Banknote, RefreshCcw, Download, Plus, Zap } from "lucide-react";
import { api, type Booking, formatCurrency, formatSlotRange, Court } from "../../lib/api";
import * as XLSX from 'xlsx';
import { formatDateVi } from "../../lib/locale";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [posForm] = Form.useForm();

  const fetchBookings = async () => {
    try {
      const res = await api.get<Booking[]>("/bookings");
      setBookings([...res.data].reverse());
    } catch {
      message.error("Không tải được danh sách đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    api.get<Court[]>("/courts").then(res => setCourts(res.data)).catch();
  }, []);

  const exportToExcel = () => {
    const exportData = filteredBookings.map(b => ({
      "Mã đơn": `BK${String(b.id).padStart(6, "0")}`,
      "Tên khách hàng": b.customer?.fullName,
      "SĐT": b.customer?.phone,
      "Tên cơ sở": b.fieldName,
      "Sân": b.court,
      "Ngày đặt": b.date,
      "Giờ đặt": b.time,
      "Thời lượng (h)": b.duration || 1,
      "Tổng tiền": b.total,
      "Thanh toán": b.paymentStatus === 'paid' ? 'Đã Thanh Toán' : (b.paymentStatus === 'deposit_paid' ? 'Đã Cọc' : 'Chưa Thanh Toán'),
      "Trạng thái": b.status
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "Danh_sach_don.xlsx");
    message.success("Xuất file Excel thành công!");
  };

  const handlePosSubmit = async (values: any) => {
    try {
      const st = values.time.format('HH:mm');
      const [h, m] = st.split(':').map(Number);
      const endTime = `${String(h + values.duration).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      const court = courts.find(c => c.id === values.courtId);
      await api.post('/bookings', {
        fieldId: court?.fieldId || 1,
        courtId: values.courtId,
        fieldName: "Hệ thống POS",
        court: court?.name || "Sân chỉ định",
        date: values.date.format('YYYY-MM-DD'),
        time: st,
        duration: values.duration,
        total: values.total,
        customer: { fullName: values.fullName, phone: values.phone, note: "Tạo từ Admin POS" },
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentMethod === 'cash' ? 'paid' : 'unpaid',
        status: "confirmed",
        createdAt: new Date().toISOString()
      });
      message.success("Tạo đơn POS thành công!");
      setIsPosOpen(false);
      posForm.resetFields();
      fetchBookings();
    } catch (e) {
      message.error("Lỗi tạo đơn");
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const current = bookings.find((b) => b.id === id);
    if (current?.status === "cancelled" && newStatus === "confirmed") {
      message.error("Đơn đã hủy — không thể xác nhận lại");
      return;
    }
    if (current?.status === "cancelled" && newStatus === "pending") {
      message.error("Đơn đã hủy — không thể chuyển về chờ xác nhận");
      return;
    }
    try {
      await api.patch(`/bookings/${id}`, { status: newStatus });
      message.success("Cập nhật trạng thái thành công!");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Cập nhật thất bại.";
      message.error(msg);
    }
  };

  const markPaymentStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/bookings/${id}`, { paymentStatus: status });
      message.success(`Đã cập nhật thanh toán: ${status}`);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, paymentStatus: status } : b))
      );
    } catch {
      message.error("Thất bại");
    }
  };

  const markCheckIn = async (id: number) => {
    try {
      await api.patch(`/bookings/${id}`, { status: "completed" });
      message.success("Khách đã Check-in (Hoàn thành đơn)");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "completed" } : b))
      );
    } catch {
      message.error("Lỗi khi Check-in");
    }
  };

  const handleQrCheckIn = async (qrValue: string) => {
    if (!qrValue) return;
    const match = qrValue.match(/CHECKIN-BK(\d+)/i);
    if (!match) {
      message.error("Mã QR không hợp lệ. Vui lòng quét lại.");
      return;
    }
    const id = Number(match[1]);
    const current = bookings.find(b => b.id === id);
    if (!current) {
      message.error("Không tìm thấy mã đơn này trong hệ thống.");
      return;
    }

    if (current.status === "completed") {
      message.warning("Đơn này đã được Check-in trước đó rồi.");
      return;
    }
    if (current.status === "cancelled") {
      message.error("Đơn này đã bị hủy, không thể Check-in.");
      return;
    }
    await markCheckIn(id);
  };



  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      render: (text: number) => (
        <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md">
          BK{String(text).padStart(6, "0")}
        </span>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_: unknown, record: Booking & { refundStk?: string, refundBank?: string }) => (
        <div>
          <div className="font-bold text-gray-800">{record.customer?.fullName}</div>
          <div className="text-gray-500 text-xs mt-0.5">{record.customer?.phone}</div>
          {record.refundStk && (
            <div className="text-[11px] text-red-600 mt-1 font-semibold flex items-center bg-red-50 px-2 py-0.5 rounded w-max">
              <RefreshCcw size={10} className="mr-1" /> Hoàn tiền: {record.refundBank} - {record.refundStk}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Thông tin sân",
      key: "courtInfo",
      render: (_: unknown, record: Booking) => (
        <div className="text-sm">
          <div className="font-semibold text-gray-800">{record.fieldName}</div>
          <div className="text-gray-500 mt-0.5">{record.court}</div>
        </div>
      ),
    },
    {
      title: "Thời gian",
      key: "time",
      render: (_: unknown, r: Booking) => (
        <div className="text-sm">
          <div className="font-medium text-gray-700">{formatDateVi(r.date)}</div>
          <div className="text-gray-500 mt-0.5">{formatSlotRange(r.time, r.duration || 1)} <span className="text-xs">({r.duration}h)</span></div>
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      render: (v: number) => (
        <span className="font-bold text-blue-600">{formatCurrency(v)}</span>
      ),
    },
    {
      title: "Thanh toán",
      key: "pay",
      render: (_: unknown, r: Booking) => (
        <div className="flex flex-col gap-1 items-start min-w-[140px]">
          <div className="text-[11px] font-medium text-gray-500 flex items-center mb-1 bg-gray-50 px-2 py-0.5 rounded">
            {r.paymentMethod === "transfer" || r.paymentMethod === "deposit" ? <CreditCard size={12} className="mr-1" /> : <Banknote size={12} className="mr-1" />}
            {r.paymentMethod === "transfer" ? "Chuyển khoản" : (r.paymentMethod === "deposit" ? "Chuyển khoản (Cọc)" : "Tại sân")}
          </div>
          <Select
            value={r.paymentStatus || "unpaid"}
            size="middle"
            className="w-full shadow-sm"
            style={{ minWidth: 140 }}
            onChange={(v) => markPaymentStatus(r.id, v)}
            options={[
              { value: "unpaid", label: <span className="font-medium text-gray-600">Chưa TT</span> },
              { value: "deposit_paid", label: <span className="font-medium text-violet-600">Đã cọc</span> },
              { value: "paid", label: <span className="font-medium text-emerald-600">Đã TT đủ</span> },
              { value: "refunded", label: <span className="font-medium text-orange-600">Đã hoàn</span> },
            ]}
          />
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: unknown, record: Booking) => (
        <Select
          value={record.status}
          size="middle"
          className="w-full shadow-sm"
          style={{ minWidth: 140 }}
          onChange={(v) => updateStatus(record.id, v)}
          options={[
            { value: "pending", label: <span className="font-medium text-amber-600">Chờ duyệt</span>, disabled: record.status === "cancelled" },
            { value: "confirmed", label: <span className="font-medium text-blue-600">Đã duyệt</span>, disabled: record.status === "cancelled" },
            { value: "completed", label: <span className="font-medium text-emerald-600">Hoàn thành</span> },
            { value: "cancelled", label: <span className="font-medium text-red-600">Đã hủy</span> },
          ]}
        />
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: unknown, r: Booking & { refundStk?: string }) => (
        <div className="flex flex-col gap-2">
          {r.status === "cancelled" && r.paymentStatus !== "refunded" && r.refundStk && (
            <Button size="small" danger type="primary" ghost className="font-semibold shadow-sm w-full text-xs" onClick={() => markPaymentStatus(r.id, "refunded")}>
              Mark Hoàn Tiền
            </Button>
          )}
          {r.status === "confirmed" && (
            <Button size="small" type="primary" className="bg-emerald-500 hover:bg-emerald-600 font-semibold shadow-emerald-500/30 shadow-md w-full border-0 text-xs flex items-center justify-center gap-1" onClick={() => markCheckIn(r.id)}>
              <CheckCircle2 size={12} /> Check-in
            </Button>
          )}
          {r.status === "pending" && (
            <Button size="small" danger type="text" className="w-full text-xs hover:bg-red-50" onClick={() => updateStatus(r.id, "cancelled")}>
              Hủy đơn
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Spin size="large" />
      </div>
    );
  }

  const openScanner = () => {
    setIsScannerOpen(true);
    setTimeout(() => {
      // @ts-ignore
      if (window.Html5QrcodeScanner) {
        // @ts-ignore
        const html5QrcodeScanner = new window.Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        html5QrcodeScanner.render((decodedText: string) => {
          handleQrCheckIn(decodedText);
          html5QrcodeScanner.clear();
          setIsScannerOpen(false);
        }, () => { });
      } else {
        message.error("Thư viện quét mã QR chưa được tải.");
      }
    }, 100);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    try {
      const el = document.getElementById("qr-reader");
      if (el) el.innerHTML = "";
    } catch (e) { }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customer?.phone?.includes(searchText) || b.customer?.fullName?.toLowerCase().includes(searchText.toLowerCase()) || `BK${String(b.id).padStart(6, "0")}`.includes(searchText.toUpperCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent tracking-tight">Quản lý Đơn Đặt Sân</h1>
          <p className="text-gray-500 mt-2 font-medium">Lưu trữ toàn bộ giao dịch, kiểm soát đặt cọc, check-in, hủy đơn</p>
        </div>
        <div className="flex gap-3">
          <Input.Search
            placeholder="Tìm mã BK, SĐT, Tên..."
            allowClear
            size="large"
            className="w-full sm:w-[280px]"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ borderRadius: '12px' }}
          />
          <Button size="large" onClick={exportToExcel} className="font-bold text-gray-700 bg-white shadow-sm border border-gray-200 rounded-xl h-12 flex items-center hover:bg-gray-50">
            <Download className="w-5 h-5 mr-2 text-emerald-600" />
            Xuất Excel
          </Button>
          <Button size="large" type="primary" onClick={openScanner} className="bg-white text-blue-600 shadow-sm border border-blue-600 font-bold px-4 flex items-center hover:bg-blue-50 rounded-xl h-12">
            <QrCode className="w-5 h-5 mr-2" />
            Quét QR Check-in
          </Button>
          <Button size="large" type="primary" onClick={() => setIsPosOpen(true)} className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/30 font-bold px-6 flex items-center border-0 rounded-xl h-12 hover:-translate-y-0.5 transition-all">
            <Plus className="w-5 h-5 mr-1" />
            Tạo Đơn (POS)
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 overflow-x-auto">
          <span className="text-sm font-bold text-gray-500 flex items-center whitespace-nowrap uppercase tracking-wider"><Filter size={16} className="mr-2" /> Dùng Bộ Lọc:</span>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: 'Chờ duyệt' },
              { key: 'confirmed', label: 'Đã duyệt' },
              { key: 'completed', label: 'Hoàn thành' },
              { key: 'cancelled', label: 'Đã hủy' }
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${statusFilter === s.key ? 'bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-900/20' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Table
          rowKey="id"
          dataSource={filteredBookings}
          columns={columns}
          pagination={{ pageSize: 12, className: "mt-6", showSizeChanger: true }}
          scroll={{ x: 1000 }}
          className="modern-table"
          components={{
            header: { cell: (props: any) => <th {...props} className="bg-gray-50/50 text-gray-500 font-bold border-b border-gray-100 py-4 uppercase text-xs tracking-wider" /> }
          }}
        />
      </div>

      <Modal
        title={<span className="font-bold text-lg">Quét mã QR Check-in</span>}
        open={isScannerOpen}
        onCancel={closeScanner}
        footer={null}
        destroyOnClose
        className="rounded-2xl overflow-hidden"
      >
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 text-center text-sm font-medium text-gray-600">
          Hãy đưa mã QR của khách hàng vào khung hình bên dưới
        </div>
        <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-blue-200"></div>
      </Modal>

      <Modal
        title={<div className="font-black text-xl flex items-center gap-2"><Zap className="text-amber-500" /> Web POS - Đặt Sân Nhanh</div>}
        open={isPosOpen}
        onCancel={() => setIsPosOpen(false)}
        footer={null}
        width={700}
        className="rounded-2xl overflow-hidden"
      >
        <Form form={posForm} layout="vertical" onFinish={handlePosSubmit} className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="fullName" label={<span className="font-semibold text-gray-700">Tên khách hàng</span>} rules={[{ required: true }]}>
              <Input size="large" placeholder="Nhập tên" className="rounded-xl" />
            </Form.Item>
            <Form.Item name="phone" label={<span className="font-semibold text-gray-700">Số điện thoại</span>} rules={[{ required: true }]}>
              <Input size="large" placeholder="Nhập SĐT" className="rounded-xl" />
            </Form.Item>
          </div>

          <Divider dashed />

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="courtId" label={<span className="font-semibold text-gray-700">Chọn Sân</span>} rules={[{ required: true }]}>
              <Select size="large" className="rounded-xl" placeholder="-- Chọn sân --">
                {courts.map(c => <Select.Option key={c.id} value={c.id}>{c.name} - Giá: {formatCurrency(c.price)}</Select.Option>)}
              </Select>
            </Form.Item>
            <div className="grid grid-cols-2 gap-2">
              <Form.Item name="date" label={<span className="font-semibold text-gray-700">Ngày đặt</span>} rules={[{ required: true }]}>
                <DatePicker size="large" className="w-full rounded-xl" format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
              <Form.Item name="time" label={<span className="font-semibold text-gray-700">Giờ bắt đầu</span>} rules={[{ required: true }]}>
                <TimePicker size="large" className="w-full rounded-xl" format="HH:mm" minuteStep={30} placeholder="Giờ" />
              </Form.Item>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Form.Item name="kiosk" label={<span className="font-semibold text-gray-700">Dịch vụ (Kiosk)</span>}>
              <Select mode="multiple" size="large" className="rounded-xl" placeholder="Chọn đồ uống/thuê giày">
                <Select.Option value="nuoc_suoi">Nước Suối (10k)</Select.Option>
                <Select.Option value="redbull">Bò Húc (20k)</Select.Option>
                <Select.Option value="thue_giay">Thuê Giày (30k)</Select.Option>
                <Select.Option value="thue_bong">Thuê Bóng (20k)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="voucher" label={<span className="font-semibold text-gray-700">Mã giảm giá (Voucher)</span>}>
              <Input size="large" className="rounded-xl font-bold uppercase text-red-500" placeholder="Nhập mã KM" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <Form.Item name="duration" label={<span className="font-semibold text-gray-700">Thời lượng (giờ)</span>} initialValue={1} rules={[{ required: true }]}>
              <InputNumber min={0.5} step={0.5} size="large" className="w-full rounded-xl" />
            </Form.Item>
            <Form.Item name="paymentMethod" label={<span className="font-semibold text-gray-700">Thanh toán</span>} rules={[{ required: true }]}>
              <Select size="large" className="rounded-xl">
                <Select.Option value="cash">Tiền mặt (Đã thu)</Select.Option>
                <Select.Option value="transfer">Chuyển khoản</Select.Option>
                <Select.Option value="deposit">Thu sau</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="total" label={<span className="font-semibold text-gray-700">Tổng thu (VNĐ)</span>} rules={[{ required: true }]}>
              <InputNumber size="large" className="w-full rounded-xl border-emerald-300 bg-emerald-50 text-emerald-700 font-bold" />
            </Form.Item>
          </div>

          <Button type="primary" htmlType="submit" size="large" block className="mt-4 bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-black tracking-wide shadow-lg shadow-emerald-500/30 rounded-xl">
            CHỐT ĐƠN & TẠO BOOKING
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
