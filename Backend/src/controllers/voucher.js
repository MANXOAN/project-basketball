import Voucher from "../models/Voucher";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";
import {
  calculateVoucherDiscount,
  normalizeVoucherCode,
  validateVoucherCode,
  voucherAvailabilityMessage,
} from "../services/voucherPolicy";

function voucherCodeFilter(code) {
  return { code: { $regex: new RegExp(["^", code, String.fromCharCode(36)].join(""), "i") } };
}

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(label + " không hợp lệ");
  return date;
}

function buildVoucherPayload(body, current = null) {
  const code = normalizeVoucherCode(body.code ?? current?.code);
  const type = String(body.type ?? current?.type ?? "percent");
  const discount = Number(body.discount ?? current?.discount);
  const limit = Number(body.limit ?? current?.limit);
  const status = String(body.status ?? current?.status ?? "active");
  const startsAt = Object.prototype.hasOwnProperty.call(body, "startsAt")
    ? parseDate(body.startsAt, "Ngày bắt đầu")
    : current?.startsAt || null;
  const endsAt = Object.prototype.hasOwnProperty.call(body, "endsAt")
    ? parseDate(body.endsAt, "Ngày kết thúc")
    : current?.endsAt || null;

  if (!validateVoucherCode(code)) throw new Error("Mã gồm 3-32 ký tự A-Z, 0-9, gạch ngang hoặc gạch dưới");
  if (!["percent", "fixed"].includes(type)) throw new Error("Loại voucher không hợp lệ");
  if (!Number.isFinite(discount) || discount <= 0 || (type === "percent" && discount > 100)) {
    throw new Error(type === "percent" ? "Phần trăm giảm phải từ 1 đến 100" : "Số tiền giảm phải lớn hơn 0");
  }
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("Số lượt sử dụng phải là số nguyên lớn hơn 0");
  if (!current && Number(body.used || 0) !== 0) throw new Error("Lượt đã dùng phải bắt đầu từ 0");
  if (current && limit < Number(current.used || 0)) throw new Error("Giới hạn không thể nhỏ hơn số lượt đã dùng");
  if (!["active", "inactive"].includes(status)) throw new Error("Trạng thái voucher không hợp lệ");
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) throw new Error("Ngày kết thúc phải sau ngày bắt đầu");

  return { code, type, discount: Math.round(discount), limit, status, startsAt, endsAt };
}

export async function getVouchers(_req, res) {
  try {
    const vouchers = await Voucher.find({}).sort({ id: 1 });
    return res.json(serializeMany(vouchers));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getVoucher(req, res) {
  try {
    const id = Number(req.params.id);
    const voucher = await Voucher.findOne({ id });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    return res.json(serialize(voucher));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function validateVoucher(req, res) {
  try {
    const code = normalizeVoucherCode(req.body.code);
    const subtotal = Number(req.body.subtotal);
    if (!validateVoucherCode(code)) return res.status(400).json({ message: "Mã khuyến mãi không hợp lệ" });
    if (!Number.isFinite(subtotal) || subtotal <= 0) return res.status(400).json({ message: "Giá trị đơn hàng không hợp lệ" });

    const voucher = await Voucher.findOne(voucherCodeFilter(code));
    const unavailableMessage = voucherAvailabilityMessage(voucher);
    if (unavailableMessage) return res.status(400).json({ message: unavailableMessage });

    return res.json({
      code: normalizeVoucherCode(voucher.code),
      type: voucher.type,
      discountAmount: calculateVoucherDiscount(voucher, subtotal),
    });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function createVoucher(req, res) {
  try {
    const payload = buildVoucherPayload(req.body);
    const existing = await Voucher.findOne(voucherCodeFilter(payload.code));
    if (existing) return res.status(409).json({ message: "Mã code đã tồn tại" });

    const id = await nextId("vouchers");
    const voucher = await Voucher.create({ ...payload, id, used: 0 });
    return res.status(201).json(serialize(voucher));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function updateVoucher(req, res) {
  try {
    const id = Number(req.params.id);
    const current = await Voucher.findOne({ id });
    if (!current) return res.status(404).json({ message: "Không tìm thấy voucher" });
    const payload = buildVoucherPayload(req.body, current);
    const existing = await Voucher.findOne({ ...voucherCodeFilter(payload.code), id: { $ne: id } });
    if (existing) return res.status(409).json({ message: "Mã code đã tồn tại" });

    const voucher = await Voucher.findOneAndUpdate(
      { id },
      { $set: payload },
      { new: true, runValidators: true }
    );
    return res.json(serialize(voucher));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function deleteVoucher(req, res) {
  try {
    const id = Number(req.params.id);
    const voucher = await Voucher.findOneAndDelete({ id });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    return res.json(serialize(voucher));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
