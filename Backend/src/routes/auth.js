import { Router } from "express";
import {
	login,
	register,
	listUsers,
	createUser,
	updateUserRole,
	updateUserByAdmin,
	updateUserStatus,
	forgotPassword,
	resetPassword,
} from "../controllers/auth";
import { adminRequired, authRequired } from "../middleware/auth";
import { updateProfile, changePassword } from "../controllers/auth";

const router = Router();
router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users", adminRequired, listUsers);
router.post("/users", adminRequired, createUser);
router.patch("/users/:id/role", adminRequired, updateUserRole);
router.patch("/users/:id/admin", adminRequired, updateUserByAdmin);
router.patch("/users/:id/status", adminRequired, updateUserStatus);
router.patch("/users/:id", authRequired, updateProfile);
router.patch("/users/:id/password", authRequired, changePassword);

export default router;
