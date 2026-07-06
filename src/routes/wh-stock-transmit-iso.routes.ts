import { Router } from "express";
import { searchWhStockTransmitIso } from "../controllers/wh-stock-transmit-iso.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/wh-stock-transmit-iso",
  authMiddleware,
  searchWhStockTransmitIso,
);

export default router;
