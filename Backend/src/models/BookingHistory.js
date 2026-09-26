import mongoose from "mongoose";

const bookingHistorySchema = new mongoose.Schema(
  {
    bookingId: { type: Number, required: true, index: true },
    bookingGroupId: { type: String, default: "", index: true },
    changeType: {
      type: String,
      enum: ["create", "update", "cancel", "reschedule", "refund", "payment"],
      required: true,
    },
    changedBy: { type: Number, default: null },
    source: { type: String, enum: ["user", "admin", "manager", "system"], default: "system" },
    reason: { type: String, default: "" },
    fieldBefore: { type: mongoose.Schema.Types.Mixed, default: null },
    fieldAfter: { type: mongoose.Schema.Types.Mixed, default: null },
    paymentDelta: { type: Number, default: 0 },
    statusBefore: { type: String, default: "" },
    statusAfter: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false }
);

bookingHistorySchema.index({ bookingId: 1, changedAt: -1 });
bookingHistorySchema.index({ bookingGroupId: 1, changedAt: -1 });

export default mongoose.model("BookingHistory", bookingHistorySchema);
