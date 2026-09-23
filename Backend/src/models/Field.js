import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    sport: { type: String, enum: ["basketball"], default: "basketball" },
    sportLabel: { type: String, enum: ["Bóng rổ"], default: "Bóng rổ" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    phone: { type: String, default: "" },
    openTime: { type: String, default: "06:00" },
    closeTime: { type: String, default: "22:00" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    courtCount: { type: Number, default: 0 },
    priceFrom: { type: Number, default: 0 },
    status: { type: String, default: "active" },
    lat: { type: Number },
    lng: { type: Number },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Field", fieldSchema);
