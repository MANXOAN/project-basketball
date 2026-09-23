import Court from "../models/Court";
import Field from "../models/Field";
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

    if (body.name && body.fieldId) {
      const existing = await Court.findOne({ name: body.name, fieldId: body.fieldId });
      if (existing) {
        return res.status(400).json({ message: "Tên sân này đã tồn tại trong cơ sở. Vui lòng chọn tên khác." });
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
    const updates = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updates, "type")) {
      updates.type = basketballCourtType(updates.type);
    }

    if (req.body.name) {
      const currentCourt = await Court.findOne({ id });
      if (!currentCourt) return res.status(404).json({ message: "Not found" });

      const existing = await Court.findOne({ name: req.body.name, fieldId: currentCourt.fieldId, id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: "Tên sân này đã tồn tại trong cơ sở. Vui lòng chọn tên khác." });
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
    const court = await Court.findOneAndDelete({ id });
    if (!court) return res.status(404).json({ message: "Not found" });
    if (court.fieldId) {
      const count = await Court.countDocuments({ fieldId: court.fieldId });
      await Field.findOneAndUpdate({ id: court.fieldId }, { courtCount: count });
    }
    return res.json(serialize(court));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
