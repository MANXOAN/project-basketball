import Field from "../models/Field";
import Court from "../models/Court";
import Booking from "../models/Booking";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";

const basketballSportValues = ["basketball", "Bóng rổ", "Bóng Rổ", "Sân Bóng Rổ"];
const activeBookingStatuses = ["pending", "confirmed"];

function exactName(value) {
  return { $regex: new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
}

function basketballFieldPayload(body) {
  const allowed = ["name", "address", "city", "phone", "openTime", "closeTime", "description", "image", "priceFrom", "rating", "status", "lat", "lng"];
  const data = Object.fromEntries(Object.entries(body || {}).filter(([key]) => allowed.includes(key)));
  if (Object.prototype.hasOwnProperty.call(data, "priceFrom")) data.priceFrom = Number(data.priceFrom);
  if (Object.prototype.hasOwnProperty.call(data, "rating")) data.rating = Number(data.rating);
  return { ...data, sport: "basketball", sportLabel: "Bóng rổ" };
}

export async function getFields(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.city) filter.city = req.query.city;
    filter.sport = { $in: basketballSportValues };
    const fields = await Field.find(filter).sort({ id: 1 });
    return res.json(serializeMany(fields));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getField(req, res) {
  try {
    const id = Number(req.params.id);
    const field = await Field.findOne({ id, sport: { $in: basketballSportValues } });
    if (!field) return res.status(404).json({ message: "Not found" });
    return res.json(serialize(field));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function createField(req, res) {
  try {
    const { name } = req.body;
    if (!String(name || "").trim()) return res.status(400).json({ message: "Tên cơ sở không được để trống" });
    if (req.body.status && !["active", "inactive"].includes(req.body.status)) return res.status(400).json({ message: "Trạng thái cơ sở không hợp lệ" });
    if (req.body.priceFrom != null && (!Number.isFinite(Number(req.body.priceFrom)) || Number(req.body.priceFrom) < 0)) return res.status(400).json({ message: "Giá cơ sở không hợp lệ" });
    if (name) {
      const existing = await Field.findOne({
        name: exactName(name)
      });
      if (existing) {
        return res.status(409).json({ message: "Tên cơ sở đã tồn tại, vui lòng nhập tên khác!" });
      }
    }
    const id = await nextId("fields");
    const field = await Field.create({ ...basketballFieldPayload(req.body), id });
    return res.status(201).json(serialize(field));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function updateField(req, res) {
  try {
    const id = Number(req.params.id);
    if (req.body.status && !["active", "inactive"].includes(req.body.status)) return res.status(400).json({ message: "Trạng thái cơ sở không hợp lệ" });
    if (req.body.priceFrom != null && (!Number.isFinite(Number(req.body.priceFrom)) || Number(req.body.priceFrom) < 0)) return res.status(400).json({ message: "Giá cơ sở không hợp lệ" });
    if (req.body.name) {
      const existing = await Field.findOne({
        name: exactName(req.body.name),
        id: { $ne: id }
      });
      if (existing) {
        return res.status(409).json({ message: "Tên cơ sở đã tồn tại, vui lòng nhập tên khác!" });
      }
    }
    const field = await Field.findOneAndUpdate(
      { id },
      { $set: basketballFieldPayload(req.body) },
      { new: true, runValidators: true }
    );
    if (!field) return res.status(404).json({ message: "Not found" });
    return res.json(serialize(field));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function deleteField(req, res) {
  try {
    const id = Number(req.params.id);
    const field = await Field.findOne({ id });
    if (!field) return res.status(404).json({ message: "Not found" });
    const courts = await Court.find({ fieldId: id }).select("id");
    const courtIds = courts.map((court) => court.id);
    const booking = await Booking.findOne({
      status: { $in: activeBookingStatuses },
      $or: [{ fieldId: id }, { courtId: { $in: courtIds } }, { reservedCourtIds: { $in: courtIds } }],
    });
    if (booking) return res.status(409).json({ message: "Không thể xóa cơ sở này vì đang có sân con chứa đơn đặt sân!" });
    await Field.deleteOne({ id });
    await Court.deleteMany({ fieldId: id });
    return res.json(serialize(field));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
