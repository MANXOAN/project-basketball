import { Router } from "express";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../controllers/customer";
import { staffRequired } from "../middleware/auth";

const router = Router();
router.get("/", staffRequired, getCustomers);
router.post("/", staffRequired, createCustomer);
router.put("/:id", staffRequired, updateCustomer);
router.patch("/:id", staffRequired, updateCustomer);
router.delete("/:id", staffRequired, deleteCustomer);
export default router;
