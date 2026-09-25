import jwt from "jsonwebtoken";

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

export function rolesRequired(...roles) {
  return function roleMiddleware(req, res, next) {
    authRequired(req, res, () => {
      if (roles.includes(req.user?.role)) return next();
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    });
  };
}

export const staffRequired = rolesRequired("admin", "manager");
export const managerRequired = rolesRequired("manager");

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
