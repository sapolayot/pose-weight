import { Router } from "express";
import coaApproveRoutes from "./coa-approve.routes";
import weighingRoutes from "./weighing.routes";
import whInventoryRoutes from "./wh-inventory.routes";
import whStockTransmitIsoSubRoutes from "./wh-stock-transmit-iso-sub.routes";
import whStockTransmitIsoRoutes from "./wh-stock-transmit-iso.routes";

export const MODULE_NAME = "weigh";

/** Path prefixes owned by this menu module (used by Swagger filter) */
export const MODULE_PATH_PREFIXES = [
  "/api/weighing-machine",
  "/api/wh-inventory",
  "/api/wh-stock-transmit-iso",
  "/api/wh-stock-transmit-iso-sub",
  "/api/coa-approve",
];

const router = Router();

router.use(whStockTransmitIsoRoutes);
router.use(whStockTransmitIsoSubRoutes);
router.use(whInventoryRoutes);
router.use(weighingRoutes);
router.use(coaApproveRoutes);

export default router;
