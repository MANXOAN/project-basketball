import mongoose from "mongoose";

const bookingAdjustmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookingGroupId: { type: String, required: true, index: true },
    bookingId: { type: Number, required: true, index: true },
    requestedBy: { type: Number, required: true },
    reason: { type: String, default: "" },
    oldValue: { type: mongoose.Schema.Types.Mixed, required: true },
    newValue: { type: mongoose.Schema.Types.Mixed, required: true },
    oldPrice: { type: Number, required: true, min: 0 },
    newPrice: { type: Number, required: true, min: 0 },
    paymentDelta: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending_payment", "applying", "applied", "refund_pending", "refunded", "failed", "cancelled"],
      default: "pending_payment",
      index: true,
    },
    failureReason: { type: String, default: "" },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("BookingAdjustment", bookingAdjustmentSchema);
