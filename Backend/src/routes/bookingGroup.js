import { Router } from "express";
import { authRequired } from "../middleware/auth";
import {
  adjustBookingGroupPayment,
  cancelBookingChild,
  createBookingGroup,
  getBookingGroup,
  getBookingGroupHistory,
  rescheduleBookingChild,
} from "../controllers/bookingGroup";

const router = Router();

router.post("/", authRequired, createBookingGroup);
router.get("/:id", authRequired, getBookingGroup);
router.patch("/:id/children/:childId", authRequired, rescheduleBookingChild);
router.post("/:id/children/:childId/cancel", authRequired, cancelBookingChild);
router.get("/:id/history", authRequired, getBookingGroupHistory);
router.post("/:id/adjust-payment", authRequired, adjustBookingGroupPayment);

export default router;
