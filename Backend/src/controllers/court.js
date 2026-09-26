import Court from "../models/Court";
import Field from "../models/Field";
import Booking from "../models/Booking";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";

function basketballCourtType(value) {
  const type = String(value || "").toLowerCase();
  if (type.includes("3x3")) return "Bóng rổ 3x3";
  if (type.includes("5x5")) return "Bóng rổ 5x5";
  return "Bóng rổ";
}

function isBasketballCourt(value) {
  return String(value || "").toLocaleLowerCase("vi-VN").includes("bóng rổ");
}

function exactName(value) {
  return { $regex: new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
}

export async function getCourts(req, res) {
  try {
    const filter = {};
    if (req.query.fieldId) filter.fieldId = Number(req.query.fieldId);
    if (req.query.status) filter.status = req.query.status;
    const courts = await Court.find(filter).sort({ id: 1 });
    return res.json(serializeMany(courts.filter((court) => isBasketballCourt(court.type))));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getCourt(req, res) {
  try {
    const id = Number(req.params.id);
    const court = await Court.findOne({ id });
    if (!court) return res.status(404).json({ message: "Not found" });
    return res.json(serialize(court));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function createCourt(req, res) {
  try {
    const id = await nextId("courts");
    const body = {
      ...req.body,
      id,
      fieldId: Number(req.body.fieldId),
      price: Number(req.body.price) || 0,
      type: basketballCourtType(req.body.type),
    };

    if (!String(body.name || "").trim() || !Number.isFinite(body.fieldId)) {
      return res.status(400).json({ message: "Tên sân và fieldId là bắt buộc" });
    }
    if (!Number.isFinite(Number(req.body.price)) || Number(req.body.price) < 0 || !["active", "inactive", "maintenance"].includes(body.status || "active")) {
      return res.status(400).json({ message: "Giá hoặc trạng thái sân không hợp lệ" });
    }
    const parentField = await Field.findOne({ id: body.fieldId });
    if (!parentField) return res.status(404).json({ message: "Cơ sở không tồn tại" });

    if (body.name && body.fieldId) {
      const existing = await Court.findOne({ name: exactName(body.name), fieldId: body.fieldId });
      if (existing) {
        return res.status(409).json({ message: "Tên sân con đã tồn tại trong cơ sở này!" });
      }
    }
    const court = await Court.create(body);
    // cập nhật courtCount
    if (body.fieldId) {
      const count = await Court.countDocuments({ fieldId: body.fieldId });
      await Field.findOneAndUpdate({ id: body.fieldId }, { courtCount: count });
    }
    return res.status(201).json(serialize(court));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function updateCourt(req, res) {
  try {
    const id = Number(req.params.id);
    const currentCourt = await Court.findOne({ id });
    if (!currentCourt) return res.status(404).json({ message: "Không tìm thấy sân con" });
    const allowed = ["fieldId", "name", "type", "price", "status", "capacity", "description", "imageUrl"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (Object.prototype.hasOwnProperty.call(updates, "fieldId")) updates.fieldId = Number(updates.fieldId);
    if (Object.prototype.hasOwnProperty.call(updates, "price")) updates.price = Number(updates.price);
    if (Object.prototype.hasOwnProperty.call(updates, "capacity")) updates.capacity = Number(updates.capacity);
    if (updates.status && !["active", "inactive", "maintenance"].includes(updates.status)) return res.status(400).json({ message: "Trạng thái sân không hợp lệ" });
    if (Object.prototype.hasOwnProperty.call(updates, "price") && (!Number.isFinite(updates.price) || updates.price < 0)) return res.status(400).json({ message: "Giá sân không hợp lệ" });
    const targetFieldId = updates.fieldId || currentCourt.fieldId;
    if (!await Field.exists({ id: targetFieldId })) return res.status(404).json({ message: "Cơ sở không tồn tại" });
    if (Object.prototype.hasOwnProperty.call(updates, "type")) {
      updates.type = basketballCourtType(updates.type);
    }

    if (req.body.name) {
      const existing = await Court.findOne({ name: exactName(req.body.name), fieldId: targetFieldId, id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ message: "Tên sân con đã tồn tại trong cơ sở này!" });
      }
    }

    const court = await Court.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!court) return res.status(404).json({ message: "Not found" });
    return res.json(serialize(court));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

export async function deleteCourt(req, res) {
  try {
    const id = Number(req.params.id);
    const court = await Court.findOne({ id });
    if (!court) return res.status(404).json({ message: "Not found" });
    const booking = await Booking.findOne({
      status: { $in: ["pending", "confirmed"] },
      $or: [{ courtId: id }, { reservedCourtIds: id }],
    });
    if (booking) return res.status(409).json({ message: "Không thể xóa sân con này vì đang có đơn đặt sân!" });
    await Court.deleteOne({ id });
    if (court.fieldId) {
      const count = await Court.countDocuments({ fieldId: court.fieldId });
      await Field.findOneAndUpdate({ id: court.fieldId }, { courtCount: count });
    }
    return res.json(serialize(court));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
