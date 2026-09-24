import assert from "assert";
import jwt from "jsonwebtoken";
import { adminRequired, managerRequired, staffRequired } from "../middleware/auth";

const secret = process.env.JWT_SECRET || "datn_sm26_jwt_secret_change_me";

function invoke(middleware, role) {
  const token = role
    ? jwt.sign({ id: role === "user" ? 10 : 20, email: `${role}@example.com`, role }, secret)
    : "";
  const result = { nextCalled: false, statusCode: 200, body: null };
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  middleware(req, res, () => {
    result.nextCalled = true;
  });
  return result;
}

assert.equal(invoke(adminRequired, "admin").nextCalled, true);
assert.equal(invoke(adminRequired, "manager").statusCode, 403);
assert.equal(invoke(adminRequired, "user").statusCode, 403);

assert.equal(invoke(managerRequired, "manager").nextCalled, true);
assert.equal(invoke(managerRequired, "admin").statusCode, 403);
assert.equal(invoke(managerRequired, "user").statusCode, 403);

assert.equal(invoke(staffRequired, "manager").nextCalled, true);
assert.equal(invoke(staffRequired, "admin").nextCalled, true);
assert.equal(invoke(staffRequired, "user").statusCode, 403);

const anonymous = invoke(staffRequired);
assert.equal(anonymous.statusCode, 401);
assert.equal(anonymous.nextCalled, false);

console.log("RBAC middleware tests passed");
