import axios from "axios";
import { cachedGet, invalidateApiCache } from "./apiCache";
import { demoCourts, demoFields } from "../data/demoData";

// src/lib/api.ts
// Dùng API cùng origin. Trong dev, Vite proxy chuyển /api về backend duy nhất;
// vì vậy máy khác mở frontend qua IP LAN cũng dùng cùng database, không gọi
// localhost của chính máy đó.
export const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function formatCurrency(value: number) {
  if (value == null || Number.isNaN(Number(value))) return "0 ₫";
  return (
    Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " ₫"
  );
}

export const TIME_SLOTS = [
  "06:00","06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
  "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", 
];

export type Field = {
  id: number;
  name: string;
  sport: string;
  sportLabel: string;
  address: string;
  city: string;
  phone: string;
  openTime: string;
  closeTime: string;
  description: string;
  image: string;
  imageUrl?: string;
  type?: string;
  location?: string;
  rating?: number;
  courtCount: number;
  priceFrom: number;
  pricePerHour?: number;
  status: string;
  /** Tọa độ bản đồ — tự chỉnh khi đổi địa chỉ */
  lat?: number;
  lng?: number;
};

export type Court = {
  id: number;
  fieldId: number;
  name: string;
  type: string;
  price: number;
  status: string;
  capacity: number;
};

const basketballLabels = new Set(["basketball", "bóng rổ", "sân bóng rổ"]);

function isBasketballField(field: Field) {
  const sport = String(field.sport || field.sportLabel || field.type || "")
    .trim()
    .toLocaleLowerCase("vi-VN");
  return basketballLabels.has(sport);
}

export type Booking = {
  id: number;
  fieldId: number;
  courtId: number;
  fieldName: string;
  court: string;
  date: string;
  time: string;
  duration: number;
  total: number;
  customer: {
    fullName: string;
    phone: string;
    note?: string;
    userId?: number;
    email?: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  paidAmount?: number;
  paymentExpiresAt?: string | null;
  refundAmount?: number;
  refundStatus?: "none" | "pending" | "completed";
  refundStk?: string;
  refundBank?: string;
  cancellationReason?: string;
  status: string;
  createdAt: string;
};

/** Check if two time ranges overlap (time as HH:mm, duration in hours) */
export function isSlotConflict(
  bookedTime: string,
  bookedDuration: number,
  newTime: string,
  newDuration: number
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const a0 = toMin(bookedTime);
  const a1 = a0 + bookedDuration * 60;
  const b0 = toMin(newTime);
  const b1 = b0 + newDuration * 60;
  return a0 < b1 && b0 < a1;
}

export async function getBookedSlots(courtId: number, date: string, force = false) {
  // Dùng 1 request theo ngày (cache) rồi lọc court — tránh N request cho N sân
  const list = await getBookingsByDate(date, force);
  return list.filter((b) => b.courtId === courtId && b.status !== "cancelled");
}

/** Lấy bookings theo ngày — cache 15s, gộp request trùng */
export async function getBookingsByDate(date: string, force = false) {
  const key = `bookings:date:${date}`;
  if (force) invalidateApiCache(key);
  return cachedGet(
    key,
    async () => {
      const res = await api.get<Booking[]>("/bookings", { params: { date } });
      return res.data;
    },
    15_000
  );
}

export async function fetchFields(force = false) {
  if (force) invalidateApiCache("fields");
  return cachedGet(
    "fields:all",
    async () => {
      try {
        const res = await api.get<Field[]>("/fields");
        const basketballFields = res.data.filter(isBasketballField);
        if (!basketballFields.length) return demoFields;
        return [...basketballFields, ...demoFields.filter((demo) => !basketballFields.some((field) => field.id === demo.id))];
      } catch {
        return demoFields;
      }
    },
    30_000
  );
}

export async function fetchCourts(params?: { fieldId?: number | string; status?: string }, force = false) {
  const key = `courts:${params?.fieldId ?? "all"}:${params?.status ?? "all"}`;
  if (force) invalidateApiCache(key);
  return cachedGet(
    key,
    async () => {
      const fallback = params?.fieldId == null ? demoCourts : demoCourts.filter((court) => court.fieldId === Number(params.fieldId));
      try {
        const res = await api.get<Court[]>("/courts", { params });
        return res.data.length ? res.data : fallback;
      } catch {
        return fallback;
      }
    },
    30_000
  );
}

export { invalidateApiCache };

/** Tính giờ kết thúc từ start HH:mm + duration (giờ) */
export function slotEndTime(start: string, duration: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + (m || 0) + Math.round(duration * 60);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export function formatSlotRange(start: string, duration: number): string {
  return `${start} – ${slotEndTime(start, duration)}`;
}
