import { NextFunction, Request, Response } from "express";
import AuthService from "../services/auth.service";

const service = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.login(req.body);

    // 🔥 เก็บ session
    (req as any).session.user = user;

    res.json({
      success: true,
      message: "Login success",
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req: Request, res: Response) {
  (req as any).session.destroy(() => {
    res.json({
      success: true,
      message: "Logged out",
    });
  });
}
