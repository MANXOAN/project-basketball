import { useCallback, useEffect, useRef, useState } from "react";
import { Table, Select, message, Spin, Button, Input, Modal, Form, DatePicker, TimePicker, InputNumber, Divider } from "antd";
import { QrCode, Filter, CheckCircle2, CreditCard, Banknote, Download, Plus, Zap, Landmark, CircleCheck, Copy, UserRound } from "lucide-react";
import { api, type Booking, formatCurrency, formatSlotRange, Court } from "../../lib/api";
import * as XLSX from 'xlsx';
import { formatDateVi } from "../../lib/locale";
import { createDemoBookings, demoCourts } from "../../data/demoData";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refundRequests, setRefundRequests] = useState<Booking[]>([]);
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [posForm] = Form.useForm();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get<Booking[]>("/bookings");
      const list = res.data.length ? res.data : createDemoBookings({ fullName: "Khách demo", phone: "0900000000" });
      setBookings([...list].reverse());
      api.get<Booking[]>("/bookings/refunds")
        .then((refunds) => setRefundRequests(refunds.data))
        .catch(() => setRefundRequests([]));
    } catch {
      setBookings(createDemoBookings({ fullName: "Khách demo", phone: "0900000000" }).reverse());
      message.info("Đang hiển thị dữ liệu minh hoạ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    api.get<Court[]>("/courts").then(res => setCourts(res.data.length ? res.data : demoCourts)).catch(() => setCourts(demoCourts));
  }, [fetchBookings]);

  // Không cần F5: khi khách hủy đơn/thanh toán ở thiết bị khác, admin lấy
  // trạng thái mới từ backend khi quay lại tab và tối đa 10 giây/lần.
  useEffect(() => {
    const refresh = () => fetchBookings();
    window.addEventListener("focus", refresh);
    window.addEventListener("booking:created", refresh);
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("booking:created", refresh);
      window.clearInterval(interval);
    };
  }, [fetchBookings]);

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

  const completeRefund = async (booking: Booking) => {
    try {
      await api.post(`/bookings/${booking.id}/refund`);
      message.success("Đã xác nhận hoàn tiền");
      setRefundModalBooking(null);
      fetchBookings();
    } catch (e: unknown) {
      const errorMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể hoàn tiền";
      message.error(errorMessage);
    }
  };

  const copyRefundValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Đã sao chép ${label}`);
    } catch {
      message.error("Không thể sao chép, vui lòng sao chép thủ công");
    }
  };

  const markCheckIn = async (id: number) => {
    try {
      await api.post(`/bookings/${id}/check-in`);
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
          <span className={`rounded-lg px-2 py-1 text-xs font-bold ${r.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : r.paymentStatus === "deposit_paid" ? "bg-violet-50 text-violet-700" : r.paymentStatus === "refunded" ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
            {r.paymentStatus === "paid" ? "Đã thanh toán" : r.paymentStatus === "deposit_paid" ? "Đã cọc 30%" : r.paymentStatus === "refunded" ? "Đã hoàn tiền" : "Chưa thanh toán"}
          </span>
        </div>
      ),
    },
    {
      title: "Hoàn tiền",
      key: "refund",
      render: (_: unknown, r: Booking) => {
        if (r.refundStatus === "pending") {
          return (
            <div className="min-w-[190px] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="font-bold">Đang chờ hoàn {formatCurrency(r.refundAmount || 0)}</div>
              <div className="mt-1.5 space-y-0.5 text-amber-800">
                <div><span className="font-semibold">Ngân hàng:</span> {r.refundBank || "Chưa có"}</div>
                <div><span className="font-semibold">STK:</span> {r.refundStk || "Chưa có"}</div>
              </div>
            </div>
          );
        }
        if (r.refundStatus === "completed") {
          return <div className="min-w-[190px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><div className="font-bold">Đã hoàn {formatCurrency(r.refundAmount || 0)}</div><div className="mt-1">{r.refundBank || "—"} · {r.refundStk || "—"}</div></div>;
        }
        return <span className="text-xs text-gray-400">Không có</span>;
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: unknown, record: Booking) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${record.status === "completed" ? "bg-emerald-50 text-emerald-700" : record.status === "confirmed" ? "bg-blue-50 text-blue-700" : record.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
          {record.status === "completed" ? "Hoàn thành" : record.status === "confirmed" ? "Đã xác nhận" : record.status === "cancelled" ? "Đã hủy" : "Chờ thanh toán"}
        </span>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: unknown, r: Booking & { refundStk?: string }) => (
        <div className="flex flex-col gap-2">
          {r.status === "cancelled" && r.refundStatus === "pending" && (
            <Button size="small" danger type="primary" ghost className="font-semibold shadow-sm w-full text-xs" onClick={() => setRefundModalBooking(r)}>
              Xử lý hoàn tiền
            </Button>
          )}
          {r.status === "confirmed" && (
            <Button size="small" type="primary" className="bg-emerald-500 hover:bg-emerald-600 font-semibold shadow-emerald-500/30 shadow-md w-full border-0 text-xs flex items-center justify-center gap-1" onClick={() => markCheckIn(r.id)}>
              <CheckCircle2 size={12} /> Check-in
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
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scannerRef.current = scanner;
      scanner.render(async (decodedText) => {
        await handleQrCheckIn(decodedText);
        await scanner.clear();
        scannerRef.current = null;
        setIsScannerOpen(false);
      }, () => undefined);
    }, 100);
  };

  const closeScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customer?.phone?.includes(searchText) || b.customer?.fullName?.toLowerCase().includes(searchText.toLowerCase()) || `BK${String(b.id).padStart(6, "0")}`.includes(searchText.toUpperCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'refund_pending' ? b.refundStatus === 'pending' : b.status === statusFilter);
    return matchesSearch && matchesStatus;
  });
  const pendingRefunds = refundRequests.filter((booking) => booking.refundStatus === "pending");
  const completedRefunds = refundRequests.filter((booking) => booking.refundStatus === "completed");
  const pendingRefundTotal = pendingRefunds.reduce((total, booking) => total + Number(booking.refundAmount || 0), 0);

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

      <div className="mb-6 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-[0_8px_30px_rgb(245,158,11,0.10)]">
        <div className="flex flex-col gap-5 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Landmark size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Hàng chờ hoàn tiền</h2>
              <p className="mt-1 text-sm text-slate-600">Đối chiếu ngân hàng và STK, chuyển tiền, sau đó mới xác nhận hoàn tất.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('refund_pending')}
            className="min-h-11 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-500 hover:text-slate-950"
          >
            Xử lý {pendingRefunds.length} yêu cầu
          </button>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-amber-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Đang chờ hoàn</div>
            <div className="mt-1 text-2xl font-black text-amber-600">{pendingRefunds.length}</div>
          </div>
          <div className="px-6 py-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng cần hoàn</div>
            <div className="mt-1 text-xl font-black text-slate-950">{formatCurrency(pendingRefundTotal)}</div>
          </div>
          <div className="flex items-center gap-3 px-6 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CircleCheck size={18} /></span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã hoàn</div>
              <div className="mt-0.5 font-black text-emerald-700">{completedRefunds.length} đơn</div>
            </div>
          </div>
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
              { key: 'cancelled', label: 'Đã hủy' },
              { key: 'refund_pending', label: 'Chờ hoàn tiền' },
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
        open={Boolean(refundModalBooking)}
        onCancel={() => setRefundModalBooking(null)}
        footer={null}
        width={560}
        destroyOnClose
        className="rounded-2xl overflow-hidden"
        title={null}
      >
        {refundModalBooking && (
          <div className="-mx-6 -mt-5 overflow-hidden">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 px-7 py-6 text-white">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950"><Landmark size={21} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Xử lý hoàn tiền</p>
                  <h2 className="mt-1 text-xl font-black">BK{String(refundModalBooking.id).padStart(6, "0")}</h2>
                </div>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Số tiền cần chuyển</div>
                <div className="mt-1 text-3xl font-black text-amber-300">{formatCurrency(refundModalBooking.refundAmount || 0)}</div>
              </div>
            </div>

            <div className="space-y-4 bg-white px-7 py-6">
              <p className="text-sm leading-6 text-slate-600">Thực hiện chuyển khoản theo thông tin bên dưới, sau đó mới bấm xác nhận để khách thấy trạng thái <strong>Đã hoàn tiền</strong>.</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950"><UserRound size={16} className="text-amber-600" /> Người nhận hoàn tiền</div>
                <div className="space-y-3 text-sm">
                  <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Khách hàng</div><div className="mt-0.5 font-bold text-slate-900">{refundModalBooking.customer?.fullName || "—"}</div></div>
                  <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Ngân hàng</div><div className="mt-0.5 font-bold text-slate-900">{refundModalBooking.refundBank || "Chưa cung cấp"}</div></div>
                  <div className="flex items-end justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Số tài khoản</div><div className="mt-0.5 font-mono text-base font-black text-slate-950">{refundModalBooking.refundStk || "Chưa cung cấp"}</div></div><button type="button" onClick={() => copyRefundValue(refundModalBooking.refundStk || "", "số tài khoản")} disabled={!refundModalBooking.refundStk} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-40"><Copy size={14} /> Sao chép</button></div>
                  <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-3"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Nội dung chuyển khoản</div><div className="mt-0.5 font-mono font-black text-slate-950">HOAN BK{String(refundModalBooking.id).padStart(6, "0")}</div></div><button type="button" onClick={() => copyRefundValue(`HOAN BK${String(refundModalBooking.id).padStart(6, "0")}`, "nội dung chuyển khoản")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"><Copy size={14} /> Sao chép</button></div>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRefundModalBooking(null)} className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">Quay lại</button>
                <button type="button" onClick={() => completeRefund(refundModalBooking)} className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500">Xác nhận đã chuyển tiền</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
