import { Router } from "express";
import {
  getBookings,
  getBookingAvailability,
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
import { adminRequired, authRequired, staffRequired } from "../middleware/auth";
import { checkBookingAvailability } from "../controllers/bookingAvailability";

const router = Router();
router.get("/", authRequired, getBookings);
router.get("/availability", getBookingAvailability);
router.post("/check-availability", authRequired, checkBookingAvailability);
router.get("/refunds", staffRequired, getRefundRequests);
router.get("/:id/detail", authRequired, getBookingDetail);
router.get("/:id", authRequired, getBooking);
router.post("/", authRequired, createBooking);
router.post("/:id/cancel", authRequired, cancelBooking);
router.post("/:id/refund", adminRequired, completeRefund);
router.post("/:id/check-in", staffRequired, checkInBooking);
router.put("/:id", staffRequired, updateBooking);
router.patch("/:id", staffRequired, updateBooking);
router.delete("/:id", adminRequired, deleteBooking);

export default router;
