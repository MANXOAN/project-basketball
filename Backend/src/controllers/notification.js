import Notification from "../models/Notification";
import { serialize, serializeMany } from "../utils/serialize";

export async function getMyNotifications(req, res) {
  try {
    const filters = [{ userId: Number(req.user.id) }];
    if (req.user.email) filters.push({ email: String(req.user.email).toLowerCase() });
    const list = await Notification.find({ $or: filters }).sort({ createdAt: -1 }).limit(30);
    return res.json(serializeMany(list));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const filters = [{ userId: Number(req.user.id) }];
    if (req.user.email) filters.push({ email: String(req.user.email).toLowerCase() });
    const notification = await Notification.findOneAndUpdate(
      { id: Number(req.params.id), $or: filters },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Không tìm thấy thông báo" });
    return res.json(serialize(notification));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}
