import mongoose from "mongoose";

const courtSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    fieldId: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Bóng rổ", "Bóng rổ 3x3", "Bóng rổ 5x5"], default: "Bóng rổ 5x5" },
    price: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["active", "maintenance", "inactive"], default: "active" },
    capacity: { type: Number, default: 10, min: 1 },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Court", courtSchema);
