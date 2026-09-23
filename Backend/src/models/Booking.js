import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    note: String,
    userId: Number,
    email: String,
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    fieldId: { type: Number, required: true, index: true },
    courtId: { type: Number, required: true, index: true },
    fieldName: { type: String, default: "" },
    court: { type: String, default: "" },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    customer: customerSchema,
    services: {
      type: Array,
      default: []
    },
    paymentMethod: { type: String, default: "cash" },
    paymentStatus: { type: String, default: "unpaid" },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentExpiresAt: { type: Date, default: null },
    status: { type: String, default: "pending" },
    voucherCode: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    refundStk: { type: String, default: "" },
    refundBank: { type: String, default: "" },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundStatus: { type: String, enum: ["none", "pending", "completed"], default: "none" },
    cancellationReason: { type: String, default: "" },
    checkedInAt: { type: Date, default: null },
    createdAt: { type: String },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Booking", bookingSchema);
