import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: Number, required: true, index: true },
    bookingGroupId: { type: String, default: "", index: true },
    paymentCode: { type: String, required: true, unique: true, index: true },
    transactionCode: { type: String, default: "" },
    gateway: { type: String, default: "sepay" },
    paymentKind: { type: String, enum: ["deposit", "balance", "full", "adjustment", "refund"], default: "full" },
    adjustmentId: { type: String, default: "", index: true },
    bankCode: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "VND" },
    status: { type: String, enum: ["pending", "success", "failed", "refund_pending", "refunded"], default: "pending" },
    paidAt: { type: Date, default: null },
    confirmationEmailSentAt: { type: Date, default: null },
    confirmationEmailClaimedAt: { type: Date, default: null },
    failureReason: { type: String, default: "" },
    rawData: { type: mongoose.Schema.Types.Mixed, default: null },
    reference: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

paymentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Payment", paymentSchema);
