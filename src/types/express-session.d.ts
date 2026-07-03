import "express-session";
import Login from "../models/login.model";

declare module "express-session" {
  interface SessionData {
    user?: Login;
  }
}

export {};
