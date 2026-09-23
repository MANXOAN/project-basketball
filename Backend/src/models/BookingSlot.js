import mongoose from "mongoose";

// A 30-minute lock. The compound unique index makes double booking impossible
// even when two create requests arrive at the same millisecond.
const bookingSlotSchema = new mongoose.Schema(
  {
    bookingId: { type: Number, required: true, index: true },
    courtId: { type: Number, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

bookingSlotSchema.index({ courtId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model("BookingSlot", bookingSlotSchema);
