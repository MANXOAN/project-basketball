import { Router } from "express";
import {
  getCourts,
  getCourt,
  createCourt,
  updateCourt,
  deleteCourt,
} from "../controllers/court";
import { managerRequired } from "../middleware/auth";

const router = Router();
router.get("/", getCourts);
router.get("/:id", getCourt);
router.post("/", managerRequired, createCourt);
router.put("/:id", managerRequired, updateCourt);
router.patch("/:id", managerRequired, updateCourt);
router.delete("/:id", managerRequired, deleteCourt);

export default router;
