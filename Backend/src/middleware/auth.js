import jwt from "jsonwebtoken";
import User from "../models/User";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "datn_sm26_jwt_secret_change_me");
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function adminRequired(req, res, next) {
  authRequired(req, res, async () => {
    if (req.user?.role === "admin") {
      return next();
    }
    return res.status(403).json({ message: "Admin only" });
  });
}

export async function attachUser(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "datn_sm26_jwt_secret_change_me");
      req.user = payload;
    } catch {
      /* ignore */
    }
  }
  next();
}
