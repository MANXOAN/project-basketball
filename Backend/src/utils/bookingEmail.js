function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
}

export function buildPaymentConfirmationEmail(booking, payment) {
  const code = `BK${String(booking.id).padStart(6, "0")}`;
  const serviceRows = (booking.services || []).map((service) =>
    `<li>${escapeHtml(service.name)} × ${Number(service.quantity || 0)} — ${money(Number(service.price || 0) * Number(service.quantity || 0))}</li>`
  ).join("");
  const paymentLabel = payment.paymentKind === "deposit"
    ? "Thanh toán tiền cọc"
    : payment.paymentKind === "balance"
      ? "Thanh toán phần còn lại"
      : "Thanh toán toàn bộ";
  const orderTotal = Number(booking.groupTotal || booking.total || 0);
  const totalPaid = payment.paymentKind === "deposit" ? Number(payment.amount) : orderTotal;
  const scheduleRows = Array.isArray(booking.schedule) && booking.schedule.length > 1
    ? booking.schedule.map((item) => `<li>${escapeHtml(item.date)} lúc ${escapeHtml(item.time)}</li>`).join("")
    : "";

  return {
    subject: `Xác nhận thanh toán đơn ${code}`,
    html: `
      <h2>Thanh toán thành công</h2>
      <p>Xin chào ${escapeHtml(booking.customer?.fullName || "Quý khách")},</p>
      <p>Hệ thống đã ghi nhận <strong>${escapeHtml(paymentLabel)}</strong> cho đơn <strong>${code}</strong>.</p>
      <ul>
        <li>Cơ sở: ${escapeHtml(booking.fieldName)}</li>
        <li>Sân: ${escapeHtml(booking.court)}</li>
        <li>Ngày chơi đầu tiên: ${escapeHtml(booking.date)}</li>
        <li>Khung giờ đầu tiên: ${escapeHtml(booking.time)} (${Number(booking.duration || 1)} giờ)</li>
        ${scheduleRows ? `<li>Số buổi: ${booking.schedule.length}</li>` : ""}
        <li>Số tiền giao dịch: ${money(payment.amount)}</li>
        <li>Đã thanh toán: ${money(totalPaid)}</li>
        <li>Tổng đơn: ${money(orderTotal)}</li>
        <li>Mã giao dịch: ${escapeHtml(payment.transactionCode || payment.paymentCode)}</li>
        ${booking.voucherCode ? `<li>Voucher: ${escapeHtml(booking.voucherCode)}${booking.groupSize > 1 ? "" : ` (giảm ${money(booking.discount)})`}</li>` : ""}
      </ul>
      ${scheduleRows ? `<p><strong>Toàn bộ lịch đã đặt:</strong></p><ul>${scheduleRows}</ul>` : ""}
      ${serviceRows ? `<p><strong>Dịch vụ:</strong></p><ul>${serviceRows}</ul>` : ""}
      <p>Thông tin khách: ${escapeHtml(booking.customer?.fullName)} — ${escapeHtml(booking.customer?.phone)}</p>
      <p>Vui lòng giữ email này để đối chiếu khi đến sân.</p>
    `,
  };
}

export function buildPaymentRefundPendingEmail(booking, payment) {
  const code = `BK${String(booking.id).padStart(6, "0")}`;
  return {
    subject: `Giao dịch cần hoàn tiền cho đơn ${code}`,
    html: `<h2>Hệ thống đã ghi nhận khoản thanh toán dư hoặc quá hạn</h2>
      <p>Xin chào ${escapeHtml(booking.customer?.fullName || "Quý khách")},</p>
      <p>Giao dịch ${escapeHtml(payment.transactionCode || payment.paymentCode)} trị giá <strong>${money(payment.amount)}</strong> không được cộng thêm vào đơn ${code}. Khoản này đã được đưa vào hàng chờ hoàn tiền.</p>
      <p>Bộ phận quản lý sẽ kiểm tra và xử lý hoàn tiền cho bạn.</p>`,
  };
}
