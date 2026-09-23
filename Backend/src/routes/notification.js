import { Router } from "express";
import { getMyNotifications, markNotificationRead } from "../controllers/notification";
import { authRequired } from "../middleware/auth";

const router = Router();
router.get("/", authRequired, getMyNotifications);
router.patch("/:id/read", authRequired, markNotificationRead);

export default router;
