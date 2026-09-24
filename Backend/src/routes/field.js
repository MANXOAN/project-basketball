import { Router } from "express";
import {
  getFields,
  getField,
  createField,
  updateField,
  deleteField,
} from "../controllers/field";
import { managerRequired } from "../middleware/auth";

const router = Router();
router.get("/", getFields);
router.get("/:id", getField);
router.post("/", managerRequired, createField);
router.put("/:id", managerRequired, updateField);
router.patch("/:id", managerRequired, updateField);
router.delete("/:id", managerRequired, deleteField);

export default router;
