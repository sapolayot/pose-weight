import { Router } from "express";

import {
  create,
  getAll,
  remove,
  update,
} from "../controllers/login.controller";
import { isLoggedIn } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", isLoggedIn, getAll);
router.post("/", isLoggedIn, create);
router.put("/:id", isLoggedIn, update);
router.delete("/:id", isLoggedIn, remove);

export default router;
