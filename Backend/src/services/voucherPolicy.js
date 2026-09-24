export function normalizeVoucherCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function validateVoucherCode(code) {
  return /^[A-Z0-9_-]{3,32}$/.test(code);
}

export function voucherAvailabilityMessage(voucher, now = new Date()) {
  if (!voucher) return "Mã khuyến mãi không tồn tại";
  if (voucher.status !== "active") return "Mã khuyến mãi chưa được kích hoạt";
  if (Number(voucher.used) >= Number(voucher.limit)) return "Mã khuyến mãi đã hết lượt sử dụng";
  if (voucher.startsAt && new Date(voucher.startsAt).getTime() > now.getTime()) {
    return "Mã khuyến mãi chưa đến thời gian áp dụng";
  }
  if (voucher.endsAt && new Date(voucher.endsAt).getTime() < now.getTime()) {
    return "Mã khuyến mãi đã hết hạn";
  }
  return "";
}

export function calculateVoucherDiscount(voucher, subtotal) {
  const normalizedSubtotal = Math.max(0, Math.round(Number(subtotal) || 0));
  const rawDiscount = voucher.type === "percent"
    ? Math.round(normalizedSubtotal * Math.min(100, Math.max(0, Number(voucher.discount))) / 100)
    : Math.max(0, Math.round(Number(voucher.discount) || 0));
  return Math.min(normalizedSubtotal, rawDiscount);
}

export function voucherClaimFilter(voucher, now = new Date()) {
  return {
    id: voucher.id,
    status: "active",
    used: { $lt: voucher.limit },
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
}
