import type { Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Table, Select, message, Spin, Button, Input, Modal, Form, DatePicker, TimePicker, InputNumber, Divider, Tooltip, Grid } from "antd";
import { QrCode, Filter, CheckCircle2, CreditCard, Banknote, Download, Plus, Zap, Landmark, CircleCheck, Copy, Printer, UserRound, Wrench } from "lucide-react";
import { api, type Booking, formatCurrency, formatSlotRange, Court } from "../../lib/api";
import * as XLSX from 'xlsx';
import { formatDateVi } from "../../lib/locale";
import { Html5QrcodeScanner } from "html5-qrcode";
import BookingPass from "../../components/BookingPass";

type PosFormValues = {
  fullName: string;
  phone: string;
  courtId: number;
  date: Dayjs;
  time: Dayjs;
  duration: number;
  total: number;
  voucher?: string;
  paymentMethod: "cash" | "full" | "deposit";
};

// Backend chỉ nhận sân bóng rổ đang hoạt động.
const isBookableCourt = (court: Court) =>
  court.status === "active" && String(court.type || "").toLocaleLowerCase("vi-VN").includes("bóng rổ");

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refundRequests, setRefundRequests] = useState<Booking[]>([]);
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(null);
  const [operationsCancelBooking, setOperationsCancelBooking] = useState<Booking | null>(null);
  const [operationsCancelReason, setOperationsCancelReason] = useState<"owner_cancelled" | "maintenance">("owner_cancelled");
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [posForm] = Form.useForm();
  const [posSubmitting, setPosSubmitting] = useState(false);
  const posCourts = courts.filter(isBookableCourt);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  // Chỉ ghim cột Mã đơn / Thao tác khi màn hình đủ rộng để phần giữa còn chỗ cuộn.
  const pinColumns = Boolean(Grid.useBreakpoint().lg);

  const fetchBookings = useCallback(async () => {
    try {
      const [res, refundResult] = await Promise.all([
        api.get<Booking[]>("/bookings"),
        api.get<Booking[]>("/bookings/refunds").catch(() => ({ data: [] as Booking[] })),
      ]);
      const refunds = refundResult.data;
      const refundByBookingId = new Map(refunds.map((booking) => [booking.id, booking]));
      setBookings(res.data
        .map((booking) => ({ ...booking, ...(refundByBookingId.get(booking.id) || {}) }))
        .sort((a, b) => Number(b.id) - Number(a.id)));
      setRefundRequests(refunds);
    } catch {
      setBookings([]);
      message.error("Không tải được danh sách đơn đặt sân.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    api.get<Court[]>("/courts").then((res) => setCourts(res.data)).catch(() => setCourts([]));
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

  const handlePosSubmit = async (values: PosFormValues) => {
    const court = posCourts.find((item) => item.id === values.courtId);
    if (!court) {
      message.error("Sân không còn hoạt động, vui lòng chọn sân khác");
      return;
    }
    const occurrence = {
      date: values.date.format("YYYY-MM-DD"),
      time: values.time.format("HH:mm"),
      duration: Number(values.duration),
    };
    setPosSubmitting(true);
    try {
      // Kiểm tra trùng lịch trước, chỉ tạo đơn khi khung giờ còn trống.
      const availability = await api.post<{ available: boolean; conflicts: Array<{ suggestions: string[] }> }>("/bookings/check-availability", {
        courtId: court.id,
        duration: occurrence.duration,
        occurrences: [occurrence],
      });
      if (!availability.data.available) {
        const suggestions = availability.data.conflicts[0]?.suggestions || [];
        const hint = suggestions.length ? ` Giờ còn trống: ${suggestions.join(", ")}` : " Ngày này không còn giờ phù hợp.";
        posForm.setFields([{ name: "time", errors: ["Khung giờ đã có người đặt hoặc ngoài giờ mở cửa"] }]);
        message.error(`${court.name} đã kín lúc ${occurrence.time} ngày ${formatDateVi(occurrence.date)}.${hint}`);
        return;
      }

      await api.post("/bookings", {
        fieldId: court.fieldId,
        courtId: court.id,
        court: court.name,
        occurrences: [occurrence],
        date: occurrence.date,
        time: occurrence.time,
        duration: occurrence.duration,
        total: values.total,
        voucherCode: values.voucher?.trim().toUpperCase() || "",
        customer: { fullName: values.fullName, phone: values.phone, note: "Tạo từ Admin POS" },
        paymentMethod: values.paymentMethod,
        createdAt: new Date().toISOString()
      });
      message.success("Tạo đơn POS thành công!");
      setIsPosOpen(false);
      posForm.resetFields();
      fetchBookings();
    } catch (e: unknown) {
      const errorMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(errorMessage || "Lỗi tạo đơn");
    } finally {
      setPosSubmitting(false);
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

  const cancelForOperations = async () => {
    if (!operationsCancelBooking) return;
    try {
      const response = await api.post<Booking>(`/bookings/${operationsCancelBooking.id}/cancel`, {
        cancellationType: operationsCancelReason,
      });
      const refundAmount = Number(response.data.refundAmount || 0);
      message.success(
        refundAmount > 0
          ? "Đã hủy đơn và tạo yêu cầu hoàn 100% " + formatCurrency(refundAmount)
          : "Đã hủy đơn và nhả lại khung giờ"
      );
      setOperationsCancelBooking(null);
      setOperationsCancelReason("owner_cancelled");
      fetchBookings();
    } catch (e: unknown) {
      const errorMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể hủy đơn";
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

  const openTicket = async (booking: Booking) => {
    setTicketBooking(booking);
    try {
      const response = await api.get<Booking>("/bookings/" + booking.id + "/detail");
      setTicketBooking(response.data);
    } catch {
      message.warning("Đang hiển thị vé từ dữ liệu danh sách; chưa tải được địa chỉ chi tiết.");
    }
  };

  const markCheckIn = async (id: number) => {
    try {
      const response = await api.post<Booking>("/bookings/" + id + "/check-in");
      message.success("Khách đã Check-in (Hoàn thành đơn)");
      setBookings((prev) => prev.map((booking) => booking.id === id ? { ...booking, ...response.data } : booking));
      setTicketBooking((current) => current?.id === id ? { ...current, ...response.data } : current);
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
    try {
      const response = await api.get<Booking>("/bookings/" + Number(match[1]) + "/detail");
      const booking = response.data;
      if (booking.status === "completed") message.warning("Đơn này đã được check-in trước đó.");
      else if (booking.status === "cancelled") message.error("Đơn này đã bị hủy, không thể check-in.");
      else message.success("Đã tìm thấy đơn. Vui lòng đối chiếu thông tin trước khi check-in.");
      setTicketBooking(booking);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(errorMessage || "Không tìm thấy mã đơn này trong hệ thống.");
    }
  };

  const paidAmountByGroup = new Map<string, number>();
  bookings.forEach((booking) => {
    if (!booking.bookingGroupId) return;
    paidAmountByGroup.set(
      booking.bookingGroupId,
      (paidAmountByGroup.get(booking.bookingGroupId) || 0) + Number(booking.paidAmount || 0)
    );
  });

  const statusChip = (status: Booking["status"]) => {
    const map: Record<string, { label: string; cls: string; dot: string }> = {
      completed: { label: "Hoàn thành", cls: "bg-stone-100 text-stone-700 ring-stone-200", dot: "bg-stone-500" },
      confirmed: { label: "Đã xác nhận", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
      cancelled: { label: "Đã hủy", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
    };
    const item = map[status] || { label: "Chờ thanh toán", cls: "bg-brand-50 text-brand-800 ring-brand-200", dot: "bg-brand-500" };
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${item.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" />
        {item.label}
      </span>
    );
  };

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      width: 100,
      fixed: pinColumns ? ("left" as const) : undefined,
      render: (text: number) => (
        <span className="whitespace-nowrap rounded-md bg-stone-100 px-1.5 py-1 text-xs font-bold text-stone-800 tabular-nums">
          BK{String(text).padStart(6, "0")}
        </span>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 140,
      render: (_: unknown, record: Booking & { refundStk?: string, refundBank?: string }) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-stone-900" title={record.customer?.fullName}>{record.customer?.fullName}</div>
          <div className="mt-0.5 text-xs text-stone-500 tabular-nums">{record.customer?.phone}</div>
        </div>
      ),
    },
    {
      title: "Sân",
      key: "courtInfo",
      width: 152,
      render: (_: unknown, record: Booking) => (
        <div className="min-w-0 text-sm">
          <div className="truncate font-semibold text-stone-800" title={record.fieldName}>{record.fieldName}</div>
          <div className="mt-0.5 truncate text-xs text-stone-500" title={record.court}>{record.court}</div>
        </div>
      ),
    },
    {
      title: "Thời gian",
      key: "time",
      width: 134,
      render: (_: unknown, r: Booking) => (
        <div className="text-sm">
          <div className="whitespace-nowrap font-semibold text-stone-800">{formatDateVi(r.date)}</div>
          <div className="mt-0.5 whitespace-nowrap text-xs text-stone-500 tabular-nums">{formatSlotRange(r.time, r.duration || 1)} · {r.duration}h</div>
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      width: 104,
      align: "right" as const,
      render: (v: number) => (
        <span className="whitespace-nowrap font-extrabold text-stone-900 tabular-nums">{formatCurrency(v)}</span>
      ),
    },
    {
      title: "Thanh toán",
      key: "pay",
      width: 184,
      render: (_: unknown, r: Booking) => {
        const isGroupedBooking = Boolean(r.bookingGroupId && Number(r.groupSize) > 1);
        const groupPaidAmount = r.bookingGroupId ? paidAmountByGroup.get(r.bookingGroupId) || 0 : 0;
        return (
          <div className="flex flex-col items-start gap-1.5">
            <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${r.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : r.paymentStatus === "deposit_paid" ? "bg-brand-50 text-brand-800 ring-brand-200" : ["refunded", "partially_refunded"].includes(r.paymentStatus) ? "bg-stone-100 text-stone-700 ring-stone-200" : "bg-white text-stone-600 ring-stone-300"}`}>
              {r.paymentStatus === "paid" ? "Đã thanh toán" : r.paymentStatus === "deposit_paid" ? "Đã cọc 30%" : r.paymentStatus === "refunded" ? "Đã hoàn tiền" : r.paymentStatus === "partially_refunded" ? "Đã hoàn 50%" : "Chưa thanh toán"}
            </span>
            <div className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-stone-500">
              {["transfer", "full", "deposit"].includes(r.paymentMethod) ? <CreditCard size={12} aria-hidden="true" /> : <Banknote size={12} aria-hidden="true" />}
              {r.paymentMethod === "full" || r.paymentMethod === "transfer" ? "Chuyển khoản 100%" : (r.paymentMethod === "deposit" ? "Chuyển khoản (Cọc)" : "Tại sân")}
            </div>
            {r.paymentStatus === "deposit_paid" && Number(r.paidAmount) > 0 && (
              <div className="text-[11px] leading-4 text-stone-600">
                {isGroupedBooking && <div>Cả lịch ({r.groupSize} buổi): <strong className="text-stone-800">{formatCurrency(groupPaidAmount)}</strong></div>}
                <div>Buổi này: {formatCurrency(Number(r.paidAmount || 0))}</div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 170,
      render: (_: unknown, r: Booking) => {
        const refundInfo = (() => {
        if (r.refundStatus === "pending") {
          return (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
              <div className="font-bold">Đang chờ hoàn {formatCurrency(r.refundAmount || 0)}{r.refundRate ? " (" + r.refundRate + "%)" : ""}</div>
              <div className="mt-1.5 space-y-0.5 text-brand-800">
                {r.refundReason === "duplicate_or_expired_payment" ? (
                  <>
                    <div><span className="font-semibold">Cổng:</span> {(r.refundGateway || "vnpay").toUpperCase()}</div>
                    <div><span className="font-semibold">Mã GD:</span> {r.refundTransactionCode || "Đang cập nhật"}</div>
                  </>
                ) : ["owner_cancelled", "maintenance", "reschedule_price_difference"].includes(r.refundReason || "") ? (
                  <>
                    <div><span className="font-semibold">Lý do:</span> {r.refundReason === "maintenance" ? "Bảo trì đột xuất" : r.refundReason === "reschedule_price_difference" ? "Chênh lệch do đổi lịch" : "Chủ sân hủy"}</div>
                    <div><span className="font-semibold">Cổng:</span> {(r.refundGateway || (r.paymentMethod === "cash" ? "tiền mặt" : "chưa xác định")).toUpperCase()}</div>
                    <div className="break-all"><span className="font-semibold">Mã GD:</span> {r.refundTransactionCode || r.refundPaymentCode || "Chưa có giao dịch điện tử"}</div>
                  </>
                ) : (
                  <>
                    <div><span className="font-semibold">Ngân hàng:</span> {r.refundBank || "Chưa có"}</div>
                    <div><span className="font-semibold">STK:</span> {r.refundStk || "Chưa có"}</div>
                  </>
                )}
              </div>
            </div>
          );
        }
        if (r.refundStatus === "completed") {
          return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><div className="font-bold">Đã hoàn {formatCurrency(r.refundAmount || 0)}{r.refundRate ? " (" + r.refundRate + "%)" : ""}</div><div className="mt-1">{["owner_cancelled", "maintenance", "reschedule_price_difference"].includes(r.refundReason || "") ? "Phương thức thanh toán gốc" : (r.refundBank || "—") + " · " + (r.refundStk || "—")}</div></div>;
        }
        return null;
        })();
        return (
          <div className="flex flex-col items-start gap-2">
            {statusChip(r.status)}
            {refundInfo}
          </div>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 128,
      fixed: pinColumns ? ("right" as const) : undefined,
      render: (_: unknown, r: Booking & { refundStk?: string }) => (
        <div className="flex flex-col gap-1.5">
          {r.refundStatus === "pending" && (
            <Button size="small" type="primary" className="w-full !text-xs" onClick={() => setRefundModalBooking(r)}>
              Hoàn tiền
            </Button>
          )}
          {r.status === "confirmed" && (
            <Button size="small" type="primary" className="w-full !border-0 !bg-emerald-600 !text-xs hover:!bg-emerald-700" icon={<CheckCircle2 size={12} aria-hidden="true" />} onClick={() => markCheckIn(r.id)}>
              Check-in
            </Button>
          )}
          {r.status !== "cancelled" && (
            <div className="flex gap-1.5">
              {r.status !== "cancelled" && (
                <Tooltip title="Xem / In vé">
                  <Button size="small" className="flex-1" aria-label={`Xem hoặc in vé BK${String(r.id).padStart(6, "0")}`} icon={<Printer size={14} aria-hidden="true" />} onClick={() => openTicket(r)} />
                </Tooltip>
              )}
              {(r.status === "pending" || r.status === "confirmed") && (
                <Tooltip title="Hủy do sân">
                  <Button size="small" danger className="flex-1" aria-label={`Hủy do sân BK${String(r.id).padStart(6, "0")}`} icon={<Wrench size={14} aria-hidden="true" />} onClick={() => { setOperationsCancelBooking(r); setOperationsCancelReason("owner_cancelled"); }} />
                </Tooltip>
              )}
            </div>
          )}
          {r.status === "cancelled" && r.refundStatus !== "pending" && <span className="text-center text-xs text-stone-400">—</span>}
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

  const filterOptions = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'confirmed', label: 'Đã duyệt' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
    { key: 'refund_pending', label: 'Chờ hoàn tiền' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Thanh công cụ */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <p className="m-0 min-w-0 max-w-md text-sm text-stone-600">Theo dõi toàn bộ giao dịch, đặt cọc, check-in và hủy đơn. Dữ liệu tự làm mới mỗi 10 giây.</p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:w-[280px]">
            <Input.Search
              placeholder="Tìm mã BK, SĐT, tên khách..."
              aria-label="Tìm đơn đặt sân"
              allowClear
              size="large"
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button size="large" onClick={exportToExcel} icon={<Download size={18} aria-hidden="true" />}>
              Xuất Excel
            </Button>
            <Button size="large" onClick={openScanner} icon={<QrCode size={18} aria-hidden="true" />}>
              Quét QR
            </Button>
            <Button size="large" type="primary" onClick={() => setIsPosOpen(true)} icon={<Plus size={18} aria-hidden="true" />} className="col-span-2 sm:col-span-1">
              Tạo đơn (POS)
            </Button>
          </div>
        </div>
      </div>

      {/* Hàng chờ hoàn tiền */}
      <section className="card overflow-hidden" aria-labelledby="refund-queue-title">
        <div className="flex flex-col gap-4 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Landmark size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 id="refund-queue-title" className="m-0 text-base font-extrabold text-stone-950">Hàng chờ hoàn tiền</h2>
              <p className="m-0 mt-0.5 text-sm text-stone-600">Đối chiếu ngân hàng và STK, chuyển tiền, sau đó mới xác nhận hoàn tất.</p>
            </div>
          </div>
          <Button
            type={pendingRefunds.length ? "primary" : "default"}
            onClick={() => setStatusFilter('refund_pending')}
            className="self-start sm:self-auto"
          >
            Xử lý {pendingRefunds.length} yêu cầu
          </Button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone-100">
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Đang chờ</div>
            <div className="mt-0.5 text-xl font-extrabold text-brand-700 tabular-nums">{pendingRefunds.length}</div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Cần hoàn</div>
            <div className="mt-0.5 truncate text-xl font-extrabold text-stone-950 tabular-nums">{formatCurrency(pendingRefundTotal)}</div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-500"><CircleCheck size={12} className="text-emerald-600" aria-hidden="true" /> Đã hoàn</div>
            <div className="mt-0.5 text-xl font-extrabold text-emerald-700 tabular-nums">{completedRefunds.length} <span className="text-sm font-bold">đơn</span></div>
          </div>
        </div>
      </section>

      {/* Bảng đơn */}
      <section className="card overflow-hidden" aria-label="Danh sách đơn đặt sân">
        <div className="flex items-center gap-3 overflow-x-auto border-b border-stone-100 px-5 py-4 sm:px-6" role="toolbar" aria-label="Lọc theo trạng thái">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500"><Filter size={14} aria-hidden="true" /> Lọc</span>
          <div className="flex gap-2">
            {filterOptions.map(s => {
              const count = s.key === 'all' ? bookings.length : s.key === 'refund_pending' ? bookings.filter((b) => b.refundStatus === 'pending').length : bookings.filter((b) => b.status === s.key).length;
              const active = statusFilter === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(s.key)}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'}`}
                >
                  {s.label}
                  <span className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!pinColumns && <p className="m-0 border-b border-stone-100 px-5 py-2 text-xs text-stone-500">Vuốt ngang bảng để xem thanh toán, trạng thái và thao tác.</p>}
        <Table
          rowKey="id"
          dataSource={filteredBookings}
          columns={columns}
          size="middle"
          tableLayout="fixed"
          pagination={{ pageSize: 12, className: "!px-5 sm:!px-6", showSizeChanger: true }}
          scroll={{ x: 1112 }}
          className="modern-table"
          locale={{ emptyText: <div className="py-12 text-center"><Filter className="mx-auto mb-2 text-stone-300" aria-hidden="true" /><div className="font-semibold text-stone-700">Không có đơn phù hợp</div><div className="text-sm text-stone-500">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</div></div> }}
        />
      </section>

      <Modal
        open={Boolean(ticketBooking)}
        onCancel={() => setTicketBooking(null)}
        footer={null}
        width={760}
        destroyOnClose
        centered
        title={null}
        styles={{ container: { padding: 0, background: "transparent", boxShadow: "none" } }}
      >
        {ticketBooking && (
          <div className="py-6">
            <BookingPass booking={ticketBooking} />
            {ticketBooking.status === "confirmed" && (
              <button type="button" onClick={() => markCheckIn(ticketBooking.id)} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">
                Xác nhận thông tin đúng & Check-in
              </button>
            )}
            <button type="button" onClick={() => setTicketBooking(null)} className="mt-4 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:border-brand-400 hover:bg-brand-50">
              Đóng vé
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(operationsCancelBooking)}
        onCancel={() => setOperationsCancelBooking(null)}
        footer={null}
        width={520}
        destroyOnClose
        title={null}
      >
        {operationsCancelBooking && (
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Wrench size={21} /></span>
              <div><div className="text-xs font-bold uppercase tracking-wider text-rose-600">Hủy đơn do phía sân</div><h2 className="m-0 mt-1 text-xl font-extrabold tabular-nums text-stone-950">BK{String(operationsCancelBooking.id).padStart(6, "0")}</h2></div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">Lý do hủy</label>
              <Select
                className="w-full"
                value={operationsCancelReason}
                onChange={(value) => setOperationsCancelReason(value)}
                options={[
                  { value: "owner_cancelled", label: "Chủ sân hủy lịch" },
                  { value: "maintenance", label: "Bảo trì đột xuất" },
                ]}
              />
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-900">
              Khách sẽ được <strong>hoàn 100% số tiền đã thanh toán</strong>, không phụ thuộc thời gian còn lại. Khung giờ được nhả ngay sau khi xác nhận.
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setOperationsCancelBooking(null)} className="btn-outline min-h-11 flex-1 rounded-xl px-4 text-sm">Quay lại</button>
              <button type="button" onClick={cancelForOperations} className="min-h-11 flex-1 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700">Xác nhận hủy</button>
            </div>
          </div>
        )}
      </Modal>

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
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-7 py-6 text-white">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white"><Landmark size={21} aria-hidden="true" /></span>
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-white/90">Xử lý hoàn tiền</p>
                  <h2 className="m-0 mt-1 text-xl font-extrabold tabular-nums">BK{String(refundModalBooking.id).padStart(6, "0")}</h2>
                </div>
              </div>
              <div className="mt-5 border-t border-white/20 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-white/90">Số tiền cần chuyển</div>
                <div className="mt-1 text-3xl font-extrabold tabular-nums text-white">{formatCurrency(refundModalBooking.refundAmount || 0)}</div>
              </div>
            </div>

            <div className="space-y-4 bg-white px-7 py-6">
              <p className="text-sm leading-6 text-stone-600">
                {refundModalBooking.refundReason === "duplicate_or_expired_payment"
                  ? "Thực hiện hoàn tiền theo giao dịch gốc trên cổng thanh toán, sau đó xác nhận kết quả cho khách."
                  : ["owner_cancelled", "maintenance", "reschedule_price_difference"].includes(refundModalBooking.refundReason || "")
                    ? "Đơn do phía sân hủy nên khách được hoàn 100%. Hoàn về phương thức thanh toán ban đầu, sau đó xác nhận kết quả."
                    : <>Thực hiện chuyển khoản theo thông tin bên dưới, sau đó mới bấm xác nhận để khách thấy trạng thái <strong>Đã hoàn tiền</strong>.</>}
              </p>
              {["duplicate_or_expired_payment", "owner_cancelled", "maintenance", "reschedule_price_difference"].includes(refundModalBooking.refundReason || "") ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
                  <div>Khách hàng: <strong>{refundModalBooking.customer?.fullName || "—"}</strong></div>
                  <div className="mt-2">Lý do: <strong>{refundModalBooking.refundReason === "duplicate_or_expired_payment" ? "Thanh toán dư hoặc quá hạn" : refundModalBooking.refundReason === "maintenance" ? "Bảo trì đột xuất" : refundModalBooking.refundReason === "reschedule_price_difference" ? "Chênh lệch do đổi lịch" : "Chủ sân hủy lịch"}</strong></div>
                  {refundModalBooking.refundPayments?.length ? (
                    <div className="mt-3 space-y-2 border-t border-brand-200 pt-3">
                      {refundModalBooking.refundPayments.map((payment) => (
                        <div key={payment.paymentCode} className="rounded-xl bg-white/70 p-3">
                          <div><span className="font-semibold">Cổng:</span> {(payment.gateway || "chưa xác định").toUpperCase()} {payment.bankCode ? "· " + payment.bankCode : ""}</div>
                          <div className="mt-1"><span className="font-semibold">Mã giao dịch:</span> <strong className="font-mono">{payment.transactionCode || "Chưa có"}</strong></div>
                          <div className="mt-1"><span className="font-semibold">Mã thanh toán:</span> <strong className="font-mono">{payment.paymentCode}</strong></div>
                          <div className="mt-1"><span className="font-semibold">Số tiền gốc:</span> {formatCurrency(payment.amount)}</div>
                          {payment.bookingGroupId && <div className="mt-2 border-t border-brand-200 pt-2 text-xs leading-5 text-brand-800">Đây là giao dịch gốc cho toàn bộ lịch nhóm; số tiền cần hoàn ở trên chỉ thuộc booking con này.</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-brand-300 bg-white/70 p-3">
                      Không tìm thấy giao dịch điện tử. Phương thức: <strong>{refundModalBooking.paymentMethod === "cash" ? "Tiền mặt tại sân" : refundModalBooking.paymentMethod}</strong> · SĐT khách: <strong>{refundModalBooking.customer?.phone || "—"}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-stone-950"><UserRound size={16} className="text-brand-600" /> Người nhận hoàn tiền</div>
                  <div className="space-y-3 text-sm">
                    <div><div className="text-xs font-bold uppercase tracking-wider text-stone-500">Khách hàng</div><div className="mt-0.5 font-bold text-stone-900">{refundModalBooking.customer?.fullName || "—"}</div></div>
                    <div><div className="text-xs font-bold uppercase tracking-wider text-stone-500">Ngân hàng</div><div className="mt-0.5 font-bold text-stone-900">{refundModalBooking.refundBank || "Chưa cung cấp"}</div></div>
                    <div className="flex items-end justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-stone-500">Số tài khoản</div><div className="mt-0.5 font-mono text-base font-black text-stone-950">{refundModalBooking.refundStk || "Chưa cung cấp"}</div></div><button type="button" onClick={() => copyRefundValue(refundModalBooking.refundStk || "", "số tài khoản")} disabled={!refundModalBooking.refundStk} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"><Copy size={14} /> Sao chép</button></div>
                    <div className="flex items-end justify-between gap-3 border-t border-stone-200 pt-3"><div><div className="text-xs font-bold uppercase tracking-wider text-stone-500">Nội dung chuyển khoản</div><div className="mt-0.5 font-mono font-black text-stone-950">HOAN BK{String(refundModalBooking.id).padStart(6, "0")}</div></div><button type="button" onClick={() => copyRefundValue(`HOAN BK${String(refundModalBooking.id).padStart(6, "0")}`, "nội dung chuyển khoản")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700"><Copy size={14} /> Sao chép</button></div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRefundModalBooking(null)} className="btn-outline min-h-11 flex-1 rounded-xl px-4 text-sm">Quay lại</button>
                <button type="button" onClick={() => completeRefund(refundModalBooking)} className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Xác nhận đã chuyển tiền</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={<span className="flex items-center gap-2 text-lg font-extrabold text-stone-950"><QrCode size={20} className="text-brand-600" aria-hidden="true" /> Quét mã QR Check-in</span>}
        open={isScannerOpen}
        onCancel={closeScanner}
        footer={null}
        destroyOnClose
        className="rounded-2xl overflow-hidden"
      >
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 mb-4 text-center text-sm font-medium text-stone-600">
          Hãy đưa mã QR của khách hàng vào khung hình bên dưới
        </div>
        <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-brand-200"></div>
      </Modal>

      <Modal
        title={<div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100"><Zap size={20} aria-hidden="true" /></span><div><div className="text-lg font-extrabold text-stone-950">Web POS - Đặt Sân Nhanh</div><div className="text-xs font-medium text-stone-500">Kiểm tra lịch trống rồi tạo đơn tại quầy</div></div></div>}
        open={isPosOpen}
        onCancel={() => setIsPosOpen(false)}
        footer={null}
        width={700}
        className="rounded-2xl overflow-hidden"
      >
        <Form form={posForm} layout="vertical" onFinish={handlePosSubmit} className="mt-6" requiredMark={false}>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-700">Khách hàng</div>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="fullName" label={<span className="font-semibold text-stone-700">Tên khách hàng</span>} rules={[{ required: true }]}>
              <Input size="large" placeholder="Nhập tên" className="rounded-xl" />
            </Form.Item>
            <Form.Item name="phone" label={<span className="font-semibold text-stone-700">Số điện thoại</span>} rules={[{ required: true }]}>
              <Input size="large" placeholder="Nhập SĐT" className="rounded-xl" />
            </Form.Item>
          </div>

          <Divider className="!my-3" />

          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-700">Lịch đặt</div>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="courtId" label={<span className="font-semibold text-stone-700">Chọn Sân</span>} rules={[{ required: true }]}>
              <Select size="large" className="rounded-xl" placeholder="-- Chọn sân --" notFoundContent="Chưa có sân bóng rổ nào đang hoạt động">
                {posCourts.map(c => <Select.Option key={c.id} value={c.id}>{c.name} - Giá: {formatCurrency(c.price)}</Select.Option>)}
              </Select>
            </Form.Item>
            <div className="grid grid-cols-2 gap-x-3">
              <Form.Item name="date" label={<span className="font-semibold text-stone-700">Ngày đặt</span>} rules={[{ required: true }]}>
                <DatePicker size="large" className="w-full rounded-xl" format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
              <Form.Item name="time" label={<span className="font-semibold text-stone-700">Giờ bắt đầu</span>} rules={[{ required: true }]}>
                <TimePicker size="large" className="w-full rounded-xl" format="HH:mm" minuteStep={30} placeholder="Giờ" />
              </Form.Item>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="kiosk" label={<span className="font-semibold text-stone-700">Dịch vụ (Kiosk)</span>}>
              <Select mode="multiple" size="large" className="rounded-xl" placeholder="Chọn đồ uống/thuê giày">
                <Select.Option value="nuoc_suoi">Nước Suối (10k)</Select.Option>
                <Select.Option value="redbull">Bò Húc (20k)</Select.Option>
                <Select.Option value="thue_giay">Thuê Giày (30k)</Select.Option>
                <Select.Option value="thue_bong">Thuê Bóng (20k)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="voucher" label={<span className="font-semibold text-stone-700">Mã giảm giá (Voucher)</span>}>
              <Input size="large" className="rounded-xl font-bold uppercase text-brand-700" placeholder="Nhập mã KM" />
            </Form.Item>
          </div>

          <div className="-mx-1 grid grid-cols-1 gap-x-4 rounded-2xl bg-stone-50 px-4 pt-4 ring-1 ring-stone-100 sm:grid-cols-3">
            <Form.Item name="duration" label={<span className="font-semibold text-stone-700">Thời lượng (giờ)</span>} initialValue={1} rules={[{ required: true }]}>
              <InputNumber min={0.5} step={0.5} size="large" className="w-full rounded-xl" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="paymentMethod" label={<span className="font-semibold text-stone-700">Thanh toán</span>} rules={[{ required: true }]}>
              <Select size="large" className="rounded-xl" placeholder="Chọn hình thức">
                <Select.Option value="cash">Tiền mặt tại sân</Select.Option>
                <Select.Option value="full">Chuyển khoản 100%</Select.Option>
                <Select.Option value="deposit">Thu sau</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="total" label={<span className="font-semibold text-stone-700">Tổng thu (VNĐ)</span>} rules={[{ required: true }]}>
              <InputNumber size="large" className="w-full rounded-xl font-bold" style={{ width: "100%" }} placeholder="0" />
            </Form.Item>
          </div>

          <Button type="primary" htmlType="submit" size="large" block loading={posSubmitting} className="mt-5 !h-12 !text-base !font-bold">
            Chốt đơn & tạo booking
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
