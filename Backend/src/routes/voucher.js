import { Router } from "express";
import {
    getVouchers,
    getVoucher,
    validateVoucher,
    createVoucher,
    updateVoucher,
    deleteVoucher
} from "../controllers/voucher";
import { adminRequired, authRequired } from "../middleware/auth";

const router = Router();

router.get("/", adminRequired, getVouchers);
router.post("/validate", authRequired, validateVoucher);
router.get("/:id", adminRequired, getVoucher);
router.post("/", adminRequired, createVoucher);
router.put("/:id", adminRequired, updateVoucher);
router.patch("/:id", adminRequired, updateVoucher);
router.delete("/:id", adminRequired, deleteVoucher);

export default router;
