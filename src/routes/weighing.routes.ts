import { Router } from "express";
import {
  getList,
  getListByQrCode,
} from "../controllers/weighing-machine.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/weighing-machine/", authMiddleware, getList);
router.get("/weighing-machine/:qrCode", authMiddleware, getListByQrCode);

export default router;
