function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function money(value) { return `${Number(value || 0).toLocaleString("vi-VN")} ₫`; }

function row(label, value, accent = false) {
  return `<tr><td style="padding:11px 0;border-bottom:1px solid #edf0f4;color:#64748b;font-size:13px;">${label}</td><td align="right" style="padding:11px 0;border-bottom:1px solid #edf0f4;color:${accent ? "#b45309" : "#172033"};font-size:13px;font-weight:700;">${value}</td></tr>`;
}

function shell(content) {
  return `<!doctype html><html lang="vi"><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#172033;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.1);">${content}</table><p style="color:#718096;font-size:12px;">GoldenState Basketball · Email xác nhận tự động</p></td></tr></table></body></html>`;
}

export function buildPaymentConfirmationEmail(booking, payment) {
  const code = `BK${String(booking.id).padStart(6, "0")}`;
  const label = payment.paymentKind === "deposit" ? "Thanh toán cọc 30%" : payment.paymentKind === "balance" ? "Thanh toán phần còn lại, booking đã đủ 100%" : "Thanh toán đủ 100%";
  const total = Number(booking.groupTotal || booking.total || 0);
  const paid = Number(booking.groupPaidAmount ?? booking.paidAmount ?? (payment.paymentKind === "deposit" ? payment.amount : total));
  const remaining = Math.max(0, total - paid);
  const schedules = Array.isArray(booking.schedule) ? booking.schedule : [];
  const sessions = schedules.length ? schedules : [booking];
  const scheduleBlock = `<div style="margin-top:18px;padding:15px;background:#f8fafc;border-radius:12px;"><div style="font-size:12px;font-weight:700;color:#64748b;">CHI TIẾT ${sessions.length > 1 ? `LỊCH ${sessions.length} BUỔI` : "BUỔI ĐẶT SÂN"}</div>${sessions.map((item, index) => `<div style="padding:9px 0;border-bottom:1px solid #e2e8f0;"><b>${sessions.length > 1 ? `Buổi ${index + 1} · ` : ""}${escapeHtml(item.court || booking.court || "Sân")}</b><div style="padding-top:4px;font-size:13px;color:#475569;">${escapeHtml(item.date || booking.date)} · ${escapeHtml(item.time || booking.time)} · ${Number(item.duration || booking.duration || 1)} giờ</div><div style="padding-top:4px;font-size:13px;font-weight:700;color:#b45309;">${money(item.total ?? booking.total)}</div></div>`).join("")}</div>`;
  return {
    subject: `✓ ${label} thành công · ${code}`,
    html: shell(`<tr><td style="padding:26px 32px;background:#0f172a;color:#fff;"><div style="color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:.12em;">GOLDENSTATE BASKETBALL</div><div style="margin-top:7px;font-size:23px;font-weight:700;">Xác nhận thanh toán</div></td></tr><tr><td style="padding:28px 32px 10px;"><p style="margin:0 0 8px;font-size:16px;font-weight:700;">Chào ${escapeHtml(booking.customer?.fullName || "Quý khách")},</p><p style="margin:0;color:#526176;font-size:14px;line-height:22px;">Chúng tôi đã nhận được <b>${label.toLowerCase()}</b> cho đơn đặt sân của bạn.</p></td></tr><tr><td style="padding:20px 32px;"><div style="padding:18px 20px;border:1px solid #e5eaf0;border-radius:14px;background:#fffdf5;"><table width="100%"><tr><td><div style="font-size:12px;color:#64748b;">MÃ CHECK-IN</div><div style="margin-top:4px;font-family:monospace;font-size:22px;font-weight:700;">${code}</div></td><td align="right"><div style="font-size:12px;color:#64748b;">ĐÃ THANH TOÁN</div><div style="margin-top:4px;font-size:20px;font-weight:700;color:#b45309;">${money(paid)}</div></td></tr></table></div></td></tr><tr><td style="padding:0 32px;"><div style="font-size:12px;font-weight:700;color:#64748b;">THÔNG TIN ĐẶT SÂN</div><table width="100%" cellspacing="0" cellpadding="0">${row("Cơ sở", escapeHtml(booking.fieldName))}${booking.fieldAddress ? row("Địa chỉ", escapeHtml(booking.fieldAddress)) : ""}${row("Sân", escapeHtml(booking.court))}${row("Thời gian", `${escapeHtml(booking.date)} · ${escapeHtml(booking.time)} (${Number(booking.duration || 1)} giờ)`)}</table>${scheduleBlock}</td></tr><tr><td style="padding:20px 32px 30px;"><div style="font-size:12px;font-weight:700;color:#64748b;">CHI TIẾT GIAO DỊCH</div><table width="100%" cellspacing="0" cellpadding="0">${row("Giao dịch lần này", money(payment.amount), true)}${row("Tổng đơn", money(total))}${row("Còn lại cần thanh toán", money(remaining), remaining > 0)}${booking.voucherCode ? row("Voucher", `${escapeHtml(booking.voucherCode)} · giảm ${money(booking.discount)}`) : ""}${row("Mã giao dịch", escapeHtml(payment.transactionCode || payment.paymentCode))}</table><div style="margin-top:20px;padding:14px 16px;background:#eff6ff;border-radius:10px;color:#334155;font-size:13px;line-height:20px;"><b>Thông tin khách:</b> ${escapeHtml(booking.customer?.fullName)} · ${escapeHtml(booking.customer?.phone)}<br>Đưa mã check-in cho lễ tân để xác nhận hoặc in lại vé.</div></td></tr>`),
  };
}

export function buildCashBookingEmail(booking) {
  const code = `BK${String(booking.id).padStart(6, "0")}`;
  const total = Number(booking.groupTotal || booking.total || 0);
  const sessions = Array.isArray(booking.schedule) && booking.schedule.length ? booking.schedule : [booking];
  const scheduleBlock = `<div style="margin-top:18px;padding:15px;background:#f8fafc;border-radius:12px;"><div style="font-size:12px;font-weight:700;color:#64748b;">CHI TIẾT ${sessions.length > 1 ? `LỊCH ${sessions.length} BUỔI` : "BUỔI ĐẶT SÂN"}</div>${sessions.map((item, index) => `<div style="padding:9px 0;border-bottom:1px solid #e2e8f0;"><b>${sessions.length > 1 ? `Buổi ${index + 1} · ` : ""}${escapeHtml(item.court || booking.court || "Sân")}</b><div style="padding-top:4px;font-size:13px;color:#475569;">${escapeHtml(item.date || booking.date)} · ${escapeHtml(item.time || booking.time)} · ${Number(item.duration || booking.duration || 1)} giờ</div><div style="padding-top:4px;font-size:13px;font-weight:700;color:#b45309;">${money(item.total ?? booking.total)}</div></div>`).join("")}</div>`;
  return {
    subject: `Xác nhận booking · thanh toán tại sân · ${code}`,
    html: shell(`<tr><td style="padding:26px 32px;background:#0f172a;color:#fff;"><div style="color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:.12em;">GOLDENSTATE BASKETBALL</div><div style="margin-top:7px;font-size:23px;font-weight:700;">Xác nhận booking</div></td></tr><tr><td style="padding:28px 32px 10px;"><p style="margin:0 0 8px;font-size:16px;font-weight:700;">Chào ${escapeHtml(booking.customer?.fullName || "Quý khách")},</p><p style="margin:0;color:#526176;font-size:14px;line-height:22px;">Booking đã được giữ. Bạn sẽ thanh toán trực tiếp tại sân.</p></td></tr><tr><td style="padding:20px 32px;"><div style="padding:18px 20px;border:1px solid #e5eaf0;border-radius:14px;background:#fffdf5;"><table width="100%"><tr><td><div style="font-size:12px;color:#64748b;">MÃ CHECK-IN</div><div style="margin-top:4px;font-family:monospace;font-size:22px;font-weight:700;">${code}</div></td><td align="right"><div style="font-size:12px;color:#64748b;">CẦN THANH TOÁN TẠI SÂN</div><div style="margin-top:4px;font-size:20px;font-weight:700;color:#b45309;">${money(total)}</div></td></tr></table></div></td></tr><tr><td style="padding:0 32px;"><div style="font-size:12px;font-weight:700;color:#64748b;">THÔNG TIN ĐẶT SÂN</div><table width="100%" cellspacing="0" cellpadding="0">${row("Cơ sở", escapeHtml(booking.fieldName))}${booking.fieldAddress ? row("Địa chỉ", escapeHtml(booking.fieldAddress)) : ""}</table>${scheduleBlock}</td></tr><tr><td style="padding:20px 32px 30px;"><p style="margin:0;color:#526176;font-size:13px;line-height:21px;">Vui lòng lưu email này và xuất trình mã check-in khi đến sân. Số tiền trên chưa được thu online.</p></td></tr>`),
  };
}

export function buildComplimentaryBookingEmail(booking) {
  const code = `BK${String(booking.id).padStart(6, "0")}`;
  const sessions = Array.isArray(booking.schedule) && booking.schedule.length ? booking.schedule : [booking];
  const scheduleBlock = `<div style="margin-top:18px;padding:15px;background:#f8fafc;border-radius:12px;"><div style="font-size:12px;font-weight:700;color:#64748b;">CHI TIẾT ${sessions.length > 1 ? `LỊCH ${sessions.length} BUỔI` : "BUỔI ĐẶT SÂN"}</div>${sessions.map((item, index) => `<div style="padding:9px 0;border-bottom:1px solid #e2e8f0;"><b>${sessions.length > 1 ? `Buổi ${index + 1} · ` : ""}${escapeHtml(item.court || booking.court || "Sân")}</b><div style="padding-top:4px;font-size:13px;color:#475569;">${escapeHtml(item.date || booking.date)} · ${escapeHtml(item.time || booking.time)} · ${Number(item.duration || booking.duration || 1)} giờ</div><div style="padding-top:4px;font-size:13px;font-weight:700;color:#047857;">${money(item.total ?? booking.total)}</div></div>`).join("")}</div>`;
  return {
    subject: `Đặt sân đã được xác nhận · ${code}`,
    html: shell(`<tr><td style="padding:26px 32px;background:#0f172a;color:#fff;"><div style="color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:.12em;">GOLDENSTATE BASKETBALL</div><div style="margin-top:7px;font-size:23px;font-weight:700;">Đặt sân đã được xác nhận</div></td></tr><tr><td style="padding:28px 32px 10px;"><p style="margin:0 0 8px;font-size:16px;font-weight:700;">Chào ${escapeHtml(booking.customer?.fullName || "Quý khách")},</p><p style="margin:0;color:#526176;font-size:14px;line-height:22px;">Đơn đặt sân của bạn đã được xác nhận. Voucher đã thanh toán toàn bộ giá trị đơn.</p></td></tr><tr><td style="padding:20px 32px;"><div style="padding:18px 20px;border:1px solid #e5eaf0;border-radius:14px;background:#fffdf5;"><div style="font-size:12px;color:#64748b;">MÃ CHECK-IN</div><div style="margin-top:4px;font-family:monospace;font-size:22px;font-weight:700;">${code}</div><div style="margin-top:8px;font-size:13px;font-weight:700;color:#047857;">Voucher: ${escapeHtml(booking.voucherCode || "")}</div></div></td></tr><tr><td style="padding:0 32px 30px;"><div style="font-size:12px;font-weight:700;color:#64748b;">LỊCH ĐÃ ĐẶT</div>${scheduleBlock}</td></tr>`),
  };
}

export function buildPaymentRefundPendingEmail(booking, payment) {
  const code = `BK${String(booking.id).padStart(6, "0")}`;
  return { subject: `Thông báo hoàn tiền · ${code}`, html: shell(`<tr><td style="padding:30px 32px;"><p>Chào ${escapeHtml(booking.customer?.fullName || "Quý khách")},</p><p>Khoản thanh toán <b>${money(payment.amount)}</b> cho đơn <b>${code}</b> đang được xử lý hoàn tiền.</p></td></tr>`) };
}
