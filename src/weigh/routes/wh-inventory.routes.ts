import { Router } from "express";
import { getInventoryByCodeAndItemCode } from "../controllers/wh-inventory.controller";
import { authMiddleware } from "../../master/middleware/auth.middleware";

const router = Router();

router.get(
  "/wh-inventory/qrcode",
  authMiddleware,
  getInventoryByCodeAndItemCode,
);

export default router;
