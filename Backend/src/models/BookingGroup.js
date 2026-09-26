import mongoose from "mongoose";

const bookingGroupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    primaryBookingId: { type: Number, required: true, index: true },
    bookingIds: { type: [Number], required: true, default: [] },
    mode: { type: String, enum: ["single", "recurring", "full_field"], default: "single" },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "deposit_paid", "paid", "refunded"], default: "unpaid" },
    status: { type: String, enum: ["pending", "confirmed", "partially_cancelled", "cancelled", "completed"], default: "pending" },
    paymentExpiresAt: { type: Date, default: null },
    userId: { type: Number, default: null, index: true },
    voucherCode: { type: String, default: "" },
    voucherClaimed: { type: Boolean, default: false },
    voucherUsageReleased: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("BookingGroup", bookingGroupSchema);
