import "dotenv/config";
import path from "path";
import mongoose from "mongoose";
// Nạp model để resetFromSnapshot tạo đủ index.
import "../models/Booking";
import "../models/BookingAdjustment";
import "../models/BookingGroup";
import "../models/BookingHistory";
import "../models/BookingSlot";
import "../models/Court";
import "../models/Customer";
import "../models/Field";
import "../models/Notification";
import "../models/Payment";
import "../models/User";
import "../models/Voucher";
import { exportSnapshot, resetFromSnapshot } from "../services/dbSnapshot";

// npm run db:export  → ghi dữ liệu DB hiện tại ra data/db-snapshot.json
// npm run db:reset   → xoá DB rồi nạp lại từ data/db-snapshot.json
const command = process.argv[2];
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/db_datn_su26";

async function main() {
  if (!["export", "reset"].includes(command)) throw new Error("Dùng: dbSnapshot.js export | reset");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const result = command === "export" ? await exportSnapshot() : await resetFromSnapshot();
  console.log(`${command === "export" ? "Đã xuất" : "Đã nạp lại"} ${path.relative(process.cwd(), result.file)}:`, JSON.stringify(result.collections));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
