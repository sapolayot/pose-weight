import { Router } from "express";
import { getList } from "../controllers/coa-approve.controller";
import { authMiddleware } from "../../master/middleware/auth.middleware";

const router = Router();

router.get("/coa-approve", authMiddleware, getList);

export default router;
