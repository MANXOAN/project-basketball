import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log("Connected to Local MongoDB");
    return false;
  } catch (err) {
    // Không tự chuyển sang DB trong RAM trong môi trường dùng DB thật: dữ liệu
    // đơn đặt có thể biến mất khi backend restart và DataGrip sẽ không thấy gì.
    if (process.env.ALLOW_IN_MEMORY_DB !== "true") {
      throw new Error(`Không kết nối được MongoDB local (${uri}). Hãy chạy MongoDB rồi thử lại: ${err.message}`);
    }
    console.log("Local MongoDB not found. Starting In-Memory MongoDB...");
    const mongod = await MongoMemoryServer.create();
    const memoryUri = mongod.getUri();
    await mongoose.connect(memoryUri);
    console.log("Connected to In-Memory MongoDB!");
    return true; // signifies it's in-memory and needs seeding
  }
}
