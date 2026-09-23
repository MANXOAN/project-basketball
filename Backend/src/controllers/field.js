import Field from "../models/Field";
import Court from "../models/Court";
import { nextId } from "../utils/ids";
import { serialize, serializeMany } from "../utils/serialize";

const basketballSportValues = ["basketball", "Bóng rổ", "Bóng Rổ", "Sân Bóng Rổ"];

function basketballFieldPayload(body) {
  return { ...body, sport: "basketball", sportLabel: "Bóng rổ" };
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
    if (name) {
      const existing = await Field.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") }
      });
      if (existing) {
        return res.status(409).json({ message: "Tên cơ sở đã tồn tại" });
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
    if (req.body.name) {
      const existing = await Field.findOne({
        name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
        id: { $ne: id }
      });
      if (existing) {
        return res.status(409).json({ message: "Tên cơ sở đã tồn tại" });
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
    const field = await Field.findOneAndDelete({ id });
    if (!field) return res.status(404).json({ message: "Not found" });
    await Court.deleteMany({ fieldId: id });
    return res.json(serialize(field));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
