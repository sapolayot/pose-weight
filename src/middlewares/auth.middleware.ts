import { NextFunction, Request, Response } from "express";

export function isLoggedIn(req: Request, res: Response, next: NextFunction) {
  const sessionUser = (req as any).session?.user;

  if (!sessionUser) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
}
