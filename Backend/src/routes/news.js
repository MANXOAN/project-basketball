import { Router } from "express";
import { getNews } from "../controllers/news";

const router = Router();
router.get("/", getNews);
export default router;
