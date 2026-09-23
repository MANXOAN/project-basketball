import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    userId: { type: Number, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    bookingId: { type: Number, required: true, index: true },
    type: { type: String, enum: ["refund_completed"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ bookingId: 1, type: 1 }, { unique: true });

export default mongoose.model("Notification", notificationSchema);
