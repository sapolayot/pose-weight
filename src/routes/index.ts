import { Router } from "express";
import authRoutes from "./auth.routes";
import coaApproveRoutes from "./coa-approve.routes";
import weighingRoutes from "./weighing.routes";
import whInventoryRoutes from "./wh-inventory.routes";
import whStockTransmitIsoSubRoutes from "./wh-stock-transmit-iso-sub.routes";
import whStockTransmitIsoRoutes from "./wh-stock-transmit-iso.routes";

const router = Router();

// router.use("/login", loginRoutes);
router.use(authRoutes);
router.use(whStockTransmitIsoRoutes);
router.use(whStockTransmitIsoSubRoutes);
router.use(whInventoryRoutes);
router.use(weighingRoutes);
router.use(coaApproveRoutes);

export default router;
