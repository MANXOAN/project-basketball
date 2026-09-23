import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User";
import Field from "./models/Field";
import Court from "./models/Court";
import Booking from "./models/Booking";
import Voucher from "./models/Voucher";
import Payment from "./models/Payment";
import { setCounter } from "./utils/ids";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/db_datn_su26";

function readBsonFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const documents = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 4 > buffer.length) {
      throw new Error(`BSON không hợp lệ tại ${filePath}: thiếu document length`);
    }

    const documentLength = buffer.readInt32LE(offset);
    if (documentLength < 5 || offset + documentLength > buffer.length) {
      throw new Error(`BSON không hợp lệ tại ${filePath}: document length sai`);
    }

    documents.push(
      mongoose.mongo.BSON.deserialize(
        buffer.subarray(offset, offset + documentLength)
      )
    );
    offset += documentLength;
  }

  return documents;
}

function loadMongoDump() {
  const candidates = [
    process.env.DB_DUMP_DIR && path.resolve(process.env.DB_DUMP_DIR),
    path.resolve(__dirname, "../db_datn_su26 (1)/db_datn_su26"),
    path.resolve(process.cwd(), "db_datn_su26 (1)/db_datn_su26"),
  ].filter(Boolean);

  const dumpDir = candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "users.bson"))
  );
  if (!dumpDir) return null;

  const collections = [
    "users",
    "fields",
    "courts",
    "bookings",
    "vouchers",
    "payments",
  ];
  const data = Object.fromEntries(
    collections.map((collection) => {
      const filePath = path.join(dumpDir, `${collection}.bson`);
      return [collection, fs.existsSync(filePath) ? readBsonFile(filePath) : []];
    })
  );

  console.log("Reading MongoDB dump", dumpDir);
  return data;
}

async function loadSeedData() {
  const dump = loadMongoDump();
  if (dump) return dump;

  const candidates = [
    path.resolve(__dirname, "../../Frontend/db.json"),
    path.resolve(process.cwd(), "../Frontend/db.json"),
    path.resolve(process.cwd(), "db.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("Reading", p);
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
  throw new Error("Không tìm thấy Frontend/db.json");
}

const basketballFieldNames = new Map([
  [1, "GoldenState Basketball Arena Nam Từ Liêm"],
  [2, "GoldenState Basketball Arena Quận 8"],
  [3, "GoldenState Basketball Arena Cầu Giấy"],
  [4, "ACE Basketball Club"],
  [5, "GoldenState Basketball Club Quận 8"],
]);

function normalizeBasketballData(source) {
  const fields = (source.fields || []).map((field) => ({
    ...field,
    name: basketballFieldNames.get(Number(field.id)) || field.name,
    sport: "basketball",
    sportLabel: "Bóng rổ",
    description: "Cơ sở bóng rổ chất lượng cao, phù hợp tập luyện và thi đấu 3x3, 5x5 cùng đội nhóm.",
    image: "/basketball-court.jpg",
  }));

  const courtPosition = new Map();
  const courts = (source.courts || []).map((court) => {
    const fieldId = Number(court.fieldId);
    const position = (courtPosition.get(fieldId) || 0) + 1;
    courtPosition.set(fieldId, position);
    const originalType = String(court.type || "").toLowerCase();
    const type = originalType.includes("3x3") ? "Bóng rổ 3x3" : "Bóng rổ 5x5";
    return {
      ...court,
      name: `Sân bóng rổ ${position}`,
      type,
      capacity: type === "Bóng rổ 3x3" ? 6 : 10,
    };
  });

  const fieldNameById = new Map(fields.map((field) => [Number(field.id), field.name]));
  const courtNameById = new Map(courts.map((court) => [Number(court.id), court.name]));
  const bookings = (source.bookings || []).map((booking) => ({
    ...booking,
    fieldName: fieldNameById.get(Number(booking.fieldId)) || booking.fieldName,
    court: courtNameById.get(Number(booking.courtId)) || booking.court,
  }));

  return { ...source, fields, courts, bookings };
}

export async function runSeed(disconnect = true) {
  const data = normalizeBasketballData(await loadSeedData());

  await Promise.all([
    User.deleteMany({}),
    Field.deleteMany({}),
    Court.deleteMany({}),
    Booking.deleteMany({}),
    Voucher.deleteMany({}),
    Payment.deleteMany({}),
  ]);

  for (const u of data.users || []) {
    let password = u.password;
    if (!password || !String(password).startsWith("$2")) {
      password = await bcrypt.hash(password || "123456", 10);
    }
    if (u.email === "admin@gmail.com") {
      password = await bcrypt.hash("123456", 10);
    }
    await User.create({ ...u, password });
  }

  for (const f of data.fields || []) {
    const courtCount = (data.courts || []).filter(
      (court) => Number(court.fieldId) === Number(f.id)
    ).length;
    await Field.create({ ...f, courtCount });
  }

  for (const c of data.courts || []) {
    await Court.create({ ...c });
  }

  for (const b of data.bookings || []) {
    await Booking.create({
      ...b,
      createdAt: b.createdAt || new Date().toISOString(),
    });
  }

  for (const v of data.vouchers || []) {
    await Voucher.create({ ...v });
  }

  for (const p of data.payments || []) {
    await Payment.create({ ...p });
  }

  const max = (arr, key = "id") =>
    arr && arr.length ? Math.max(...arr.map((x) => Number(x[key]) || 0)) : 0;

  await setCounter("users", max(data.users));
  await setCounter("fields", max(data.fields));
  await setCounter("courts", max(data.courts));
  await setCounter("bookings", max(data.bookings));
  await setCounter("vouchers", max(data.vouchers));
  console.log(
    "Seed done:",
    `users=${data.users?.length || 0}`,
    `fields=${data.fields?.length || 0}`,
    `courts=${data.courts?.length || 0}`,
    `bookings=${data.bookings?.length || 0}`,
    `vouchers=${data.vouchers?.length || 0}`,
    `payments=${data.payments?.length || 0}`
  );
  if (disconnect) await mongoose.disconnect();
}

// Nếu chạy file trực tiếp
if (require.main === module) {
  mongoose.connect(MONGODB_URI).then(() => runSeed(true)).catch(e => {
    console.error(e); process.exit(1);
  });
}
