import { Router } from "express";
import {
    getVouchers,
    getVoucher,
    createVoucher,
    updateVoucher,
    deleteVoucher
} from "../controllers/voucher";
import { adminRequired, authRequired } from "../middleware/auth";

const router = Router();

router.get("/", authRequired, getVouchers);
router.get("/:id", authRequired, getVoucher);
router.post("/", adminRequired, createVoucher);
router.put("/:id", adminRequired, updateVoucher);
router.patch("/:id", adminRequired, updateVoucher);
router.delete("/:id", adminRequired, deleteVoucher);

export default router;
