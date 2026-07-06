import { NextFunction, Request, Response } from "express";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
}

/** @deprecated ใช้ authMiddleware แทน */
export const isLoggedIn = authMiddleware;
