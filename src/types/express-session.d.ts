import "express-session";
import { SessionUser } from "../types/auth.type";

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export {};
