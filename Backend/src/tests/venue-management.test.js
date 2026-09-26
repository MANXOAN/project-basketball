import assert from "assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Booking from "../models/Booking";
import Court from "../models/Court";
import Field from "../models/Field";
import { createCourt, deleteCourt, updateCourt } from "../controllers/court";
import { createField, deleteField } from "../controllers/field";
import { setCounter } from "../utils/ids";

function responseRecorder() {
  const result = { statusCode: 200, body: null };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return this; },
  };
  return { result, res };
}

async function run() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  try {
    await setCounter("fields", 0);
    await setCounter("courts", 0);

    const fieldResponse = responseRecorder();
    await createField({ body: { name: "Cơ sở Manager", address: "Quận 1", priceFrom: 100000, status: "active" } }, fieldResponse.res);
    assert.equal(fieldResponse.result.statusCode, 201);
    const fieldId = fieldResponse.result.body.id;

    const missingFieldResponse = responseRecorder();
    await createCourt({ body: { fieldId: 999, name: "Sân mồ côi", type: "Bóng rổ 5x5", price: 100000, status: "active", capacity: 10 } }, missingFieldResponse.res);
    assert.equal(missingFieldResponse.result.statusCode, 404);

    const courtResponse = responseRecorder();
    await createCourt({ body: { fieldId, name: "Sân con 1", type: "Bóng rổ 5x5", price: 120000, status: "active", capacity: 10, description: "Sân trong nhà" } }, courtResponse.res);
    assert.equal(courtResponse.result.statusCode, 201);
    const courtId = courtResponse.result.body.id;
    assert.equal((await Field.findOne({ id: fieldId })).courtCount, 1);

    const updateResponse = responseRecorder();
    await updateCourt({ params: { id: String(courtId) }, body: { price: 150000, status: "maintenance", id: 9999 } }, updateResponse.res);
    assert.equal(updateResponse.result.statusCode, 200);
    assert.equal(updateResponse.result.body.id, courtId);
    assert.equal(updateResponse.result.body.price, 150000);
    assert.equal(updateResponse.result.body.status, "maintenance");

    await Booking.create({
      id: 900,
      fieldId,
      courtId,
      fieldName: "Cơ sở Manager",
      court: "Sân con 1",
      date: "2030-01-01",
      time: "08:00",
      duration: 1,
      total: 150000,
      customer: { fullName: "Khách Test", phone: "0900000900" },
      status: "confirmed",
    });
    const blockedCourtDelete = responseRecorder();
    await deleteCourt({ params: { id: String(courtId) } }, blockedCourtDelete.res);
    assert.equal(blockedCourtDelete.result.statusCode, 409);

    const blockedFieldDelete = responseRecorder();
    await deleteField({ params: { id: String(fieldId) } }, blockedFieldDelete.res);
    assert.equal(blockedFieldDelete.result.statusCode, 409);

    await Booking.updateOne({ id: 900 }, { $set: { status: "completed" } });
    const deleteCourtResponse = responseRecorder();
    await deleteCourt({ params: { id: String(courtId) } }, deleteCourtResponse.res);
    assert.equal(deleteCourtResponse.result.statusCode, 200);
    assert.equal(await Court.countDocuments({ id: courtId }), 0);

    const deleteFieldResponse = responseRecorder();
    await deleteField({ params: { id: String(fieldId) } }, deleteFieldResponse.res);
    assert.equal(deleteFieldResponse.result.statusCode, 200);
    assert.equal(await Field.countDocuments({ id: fieldId }), 0);

    console.log("Venue management tests passed");
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
