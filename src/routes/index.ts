import { Router } from "express";
import authRoutes from "./auth.routes";
import whStockTransmitIsoSubRoutes from "./wh-stock-transmit-iso-sub.routes";
import whStockTransmitIsoRoutes from "./wh-stock-transmit-iso.routes";

const router = Router();

// router.use("/login", loginRoutes);
router.use(authRoutes);
router.use(whStockTransmitIsoRoutes);
router.use(whStockTransmitIsoSubRoutes);

export default router;
