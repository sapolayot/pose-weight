import { Router } from "express";
import { getByDocNo } from "../controllers/wh-stock-transmit-iso-sub.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/wh-stock-transmit-iso-sub/:docNo", authMiddleware, getByDocNo);

export default router;
