import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db";
import path from "path";

import authRouter from "./routes/auth";
import fieldRouter from "./routes/field";
import courtRouter from "./routes/court";
import bookingRouter from "./routes/booking";
import bookingGroupRouter from "./routes/bookingGroup";
import voucherRouter from "./routes/voucher";
import vnpayRouter from "./routes/vnpay";
import newsRouter from "./routes/news";
import { expirePendingPayments } from "./controllers/booking";
import notificationRouter from "./routes/notification";
import customerRouter from "./routes/customer";
import { resetFromSnapshot } from "./services/dbSnapshot";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/db_datn_su26";

app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// API giống json-server (root) để Frontend ít phải đổi
app.use(authRouter); // /login /register /users
app.use("/fields", fieldRouter);
app.use("/courts", courtRouter);
app.use("/bookings", bookingRouter);
app.use("/booking-groups", bookingGroupRouter);
app.use("/vouchers", voucherRouter);
app.use("/vnpay", vnpayRouter);
app.use("/news", newsRouter);
app.use("/notifications", notificationRouter);
app.use("/customers", customerRouter);


// alias /api/*
app.use("/api", authRouter);
app.use("/api/fields", fieldRouter);
app.use("/api/courts", courtRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/booking-groups", bookingGroupRouter);
app.use("/api/vouchers", voucherRouter);
app.use("/api/vnpay", vnpayRouter);
app.use("/api/news", newsRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/customers", customerRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "DATN SM26 API",
    status: "ok",
    endpoints: ["/login", "/register", "/fields", "/courts", "/bookings", "/vouchers", "/news"],
  });
});

import { runSeed } from "./seed";

connectDB(MONGODB_URI)
  .then(async (inMemory) => {
    if (inMemory) {
      await runSeed(false);
      console.log("Memory DB automatically seeded!");
    }
    // Mỗi lần khởi động: xoá dữ liệu local rồi nạp lại dữ liệu chuẩn trong
    // data/db-snapshot.json để mọi máy trong team có cùng dữ liệu.
    if (!inMemory && process.env.DB_RESET_ON_START !== "false") {
      try {
        const result = await resetFromSnapshot();
        console.log(`[db] Đã xoá và nạp lại dữ liệu chuẩn (xuất lúc ${result.exportedAt}):`, JSON.stringify(result.collections));
      } catch (error) {
        console.error("[db] Không nạp được dữ liệu chuẩn, giữ nguyên dữ liệu hiện có:", error.message);
      }
    }
    await expirePendingPayments();
    const paymentExpiryTimer = setInterval(() => {
      expirePendingPayments().catch((error) => {
        console.error("Payment expiry sweep failed:", error.message);
      });
    }, 30_000);
    paymentExpiryTimer.unref();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
