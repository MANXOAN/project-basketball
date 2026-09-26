import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Dữ liệu chuẩn của team được lưu thành file JSON trong repo (data/db-snapshot.json).
// Khi backend khởi động: xoá sạch dữ liệu hiện có rồi nạp lại từ file này.
// Định dạng Extended JSON để giữ nguyên ObjectId, Date... khi nạp lại.

const { EJSON } = mongoose.mongo.BSON;
const SNAPSHOT_FORMAT = "goldenstate-db-snapshot/v1";

export const SNAPSHOT_FILE = path.resolve(__dirname, "../../data/db-snapshot.json");
const BACKUP_FILE = path.resolve(__dirname, "../../backups/last-before-reset.json");

function database() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Chưa kết nối MongoDB");
  return db;
}

async function userCollections() {
  const collections = await database().listCollections({}, { nameOnly: true }).toArray();
  return collections.map((item) => item.name).filter((name) => !name.startsWith("system.")).sort();
}

function counts(collections) {
  return Object.fromEntries(Object.entries(collections).map(([name, docs]) => [name, docs.length]));
}

/** Đọc toàn bộ dữ liệu hiện tại của DB. */
export async function createSnapshot() {
  const db = database();
  const collections = {};
  for (const name of await userCollections()) {
    // Sắp theo _id để file ổn định, git diff chỉ hiện đúng phần thay đổi.
    collections[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
  }
  return { format: SNAPSHOT_FORMAT, exportedAt: new Date().toISOString(), database: db.databaseName, collections };
}

function writeSnapshot(snapshot, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, EJSON.stringify(snapshot, undefined, 2, { relaxed: false }) + "\n");
}

export function readSnapshot(file = SNAPSHOT_FILE) {
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file dữ liệu chuẩn ${path.relative(process.cwd(), file)}`);
  const snapshot = EJSON.parse(fs.readFileSync(file, "utf8"), { relaxed: false });
  if (snapshot?.format !== SNAPSHOT_FORMAT || typeof snapshot.collections !== "object") {
    throw new Error(`File ${path.relative(process.cwd(), file)} không đúng định dạng dữ liệu chuẩn`);
  }
  return snapshot;
}

/** Ghi dữ liệu DB hiện tại ra file chuẩn (để commit lên git). */
export async function exportSnapshot(file = SNAPSHOT_FILE) {
  const snapshot = await createSnapshot();
  writeSnapshot(snapshot, file);
  return { file, collections: counts(snapshot.collections) };
}

/**
 * Xoá toàn bộ dữ liệu rồi nạp lại từ file chuẩn. Lưu một bản sao dữ liệu cũ vào
 * backups/last-before-reset.json (chỉ giữ bản gần nhất) để lỡ tay còn khôi phục được.
 */
export async function resetFromSnapshot(file = SNAPSHOT_FILE) {
  const snapshot = readSnapshot(file);
  const db = database();

  const previous = await createSnapshot();
  if (Object.values(previous.collections).some((docs) => docs.length)) {
    try {
      writeSnapshot(previous, BACKUP_FILE);
    } catch (error) {
      // Không ghi được bản sao (ví dụ thư mục do Docker tạo thuộc root) thì vẫn tiếp tục nạp lại.
      console.warn(`[db] Không lưu được bản sao ${path.relative(process.cwd(), BACKUP_FILE)}: ${error.message}`);
    }
  }

  // Tạo index (unique id, khoá slot chống đặt trùng...) trước khi nạp dữ liệu.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const names = new Set([...Object.keys(previous.collections), ...Object.keys(snapshot.collections)]);
  for (const name of names) {
    const collection = db.collection(name);
    await collection.deleteMany({});
    const docs = snapshot.collections[name] || [];
    if (docs.length) await collection.insertMany(docs, { ordered: true });
  }
  return { file, exportedAt: snapshot.exportedAt, collections: counts(snapshot.collections) };
}
