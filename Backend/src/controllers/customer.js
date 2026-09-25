import Customer from "../models/Customer";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";

function customerPayload(body) {
  const fullName = String(body.fullName || "").trim();
  const phone = String(body.phone || "").replace(/\s+/g, "").trim();
  if (!fullName) throw new Error("Họ tên là bắt buộc");
  if (!phone) throw new Error("Số điện thoại là bắt buộc");
  return { fullName, phone, email: String(body.email || "").trim().toLowerCase(), note: String(body.note || "").trim() };
}

export async function getCustomers(_req, res) {
  try { return res.json(serializeMany(await Customer.find({}).sort({ id: 1 }))); }
  catch (e) { return res.status(500).json({ message: e.message }); }
}

export async function createCustomer(req, res) {
  try {
    const data = customerPayload(req.body);
    if (await Customer.findOne({ phone: data.phone })) return res.status(409).json({ message: "Số điện thoại đã tồn tại" });
    return res.status(201).json(serialize(await Customer.create({ ...data, id: await nextId("customers") })));
  } catch (e) { return res.status(400).json({ message: e.message }); }
}

export async function updateCustomer(req, res) {
  try {
    const id = Number(req.params.id); const data = customerPayload(req.body);
    if (await Customer.findOne({ phone: data.phone, id: { $ne: id } })) return res.status(409).json({ message: "Số điện thoại đã tồn tại" });
    const customer = await Customer.findOneAndUpdate({ id }, { $set: data }, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    return res.json(serialize(customer));
  } catch (e) { return res.status(400).json({ message: e.message }); }
}

export async function deleteCustomer(req, res) {
  try {
    const customer = await Customer.findOneAndDelete({ id: Number(req.params.id) });
    if (!customer) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    return res.json(serialize(customer));
  } catch (e) { return res.status(500).json({ message: e.message }); }
}
