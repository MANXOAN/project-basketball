import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { nextId } from "../utils/ids";
import { serialize } from "../utils/serialize";

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    process.env.JWT_SECRET || "datn_sm26_jwt_secret_change_me",
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

/** POST /register — giống json-server-auth */
export async function register(req, res) {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email và mật khẩu bắt buộc" });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const id = await nextId("users");
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      id,
      email: String(email).toLowerCase(),
      password: hash,
      fullName: fullName || "",
      phone: phone || "",
      // Public registration may only create a customer account. Admin roles
      // must be assigned by an authenticated administrator in a separate flow.
      role: "user",
    });
    const accessToken = signToken(user);
    return res.status(201).json({
      accessToken,
      user: serialize(user),
    });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

/** POST /login */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Cannot find user" });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Incorrect password" });
    }
    const accessToken = signToken(user);
    return res.json({
      accessToken,
      user: serialize(user),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

/** POST /forgot-password — demo reset flow; production should email the token */
export async function forgotPassword(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    const response = {
      message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.",
    };

    if (!user) return res.json(response);

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // The demo UI uses this token as a stand-in for an email link.
    if (process.env.NODE_ENV !== "production") response.resetToken = resetToken;
    return res.json(response);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

/** POST /reset-password */
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: "Token hoặc mật khẩu mới không hợp lệ" });
    }

    const user = await User.findOne({
      resetToken: String(token),
      resetTokenExpiresAt: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: "Liên kết đã hết hạn hoặc không hợp lệ" });

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetToken = "";
    user.resetTokenExpiresAt = null;
    await user.save();
    return res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

/** GET /users?email= */
export async function listUsers(req, res) {
  try {
    const filter = {};
    if (req.query.email) filter.email = String(req.query.email).toLowerCase();
    const users = await User.find(filter).select("-password");
    return res.json(users.map(serialize));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

/** PATCH /users/:id — user tự cập nhật thông tin cơ bản */
export async function updateProfile(req, res) {
  try {
    const id = Number(req.params.id);
    if (req.user?.id !== id) {
      return res.status(403).json({ message: "Bạn chỉ có thể cập nhật tài khoản của mình" });
    }

    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    if (typeof req.body.fullName === "string") user.fullName = req.body.fullName.trim();
    if (typeof req.body.phone === "string") user.phone = req.body.phone.trim();
    if (typeof req.body.avatar === "string") user.avatar = req.body.avatar.trim();
    await user.save();
    return res.json(serialize(user));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

/** PATCH /users/:id/password — đổi mật khẩu của chính user */
export async function changePassword(req, res) {
  try {
    const id = Number(req.params.id);
    if (req.user?.id !== id) {
      return res.status(403).json({ message: "Bạn chỉ có thể đổi mật khẩu của mình" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}
