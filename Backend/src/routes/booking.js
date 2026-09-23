import { Router } from "express";
import {
  getBookings,
  getBooking,
  getBookingDetail,
  getRefundRequests,
  createBooking,
  updateBooking,
  deleteBooking,
  cancelBooking,
  completeRefund,
  checkInBooking,
} from "../controllers/booking";
import { adminRequired } from "../middleware/auth";

const router = Router();
router.get("/", getBookings);
router.get("/refunds", adminRequired, getRefundRequests);
router.get("/:id/detail", getBookingDetail);
router.get("/:id", getBooking);
router.post("/", createBooking);
router.post("/:id/cancel", cancelBooking);
router.post("/:id/refund", adminRequired, completeRefund);
router.post("/:id/check-in", adminRequired, checkInBooking);
router.put("/:id", updateBooking);
router.patch("/:id", updateBooking);
router.delete("/:id", deleteBooking);

export default router;
