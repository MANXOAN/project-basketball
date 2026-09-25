import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, unique: true },
  email: { type: String, default: "", trim: true, lowercase: true },
  note: { type: String, default: "", trim: true },
}, { timestamps: true, versionKey: false });

export default mongoose.model("Customer", customerSchema);
