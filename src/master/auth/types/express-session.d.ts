import "express-session";
import { SessionUser } from "./auth.type";

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export {};
