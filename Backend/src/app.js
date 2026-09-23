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
import voucherRouter from "./routes/voucher";
import vnpayRouter from "./routes/vnpay";
import newsRouter from "./routes/news";
import notificationRouter from "./routes/notification";

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
app.use("/vouchers", voucherRouter);
app.use("/vnpay", vnpayRouter);
app.use("/news", newsRouter);
app.use("/notifications", notificationRouter);


// alias /api/*
app.use("/api", authRouter);
app.use("/api/fields", fieldRouter);
app.use("/api/courts", courtRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/vouchers", voucherRouter);
app.use("/api/vnpay", vnpayRouter);
app.use("/api/news", newsRouter);
app.use("/api/notifications", notificationRouter);

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
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
