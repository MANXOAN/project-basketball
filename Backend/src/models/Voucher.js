import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
    {
        id: { type: Number, unique: true, required: true },
        code: { type: String, required: true, trim: true, uppercase: true, unique: true, minlength: 3, maxlength: 32 },
        discount: { type: Number, required: true, min: 1 },
        type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
        limit: { type: Number, required: true, min: 1 },
        used: { type: Number, default: 0, min: 0 },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        startsAt: { type: Date, default: null },
        endsAt: { type: Date, default: null },
    },
    { timestamps: true, versionKey: false }
);

export default mongoose.model("Voucher", voucherSchema);
