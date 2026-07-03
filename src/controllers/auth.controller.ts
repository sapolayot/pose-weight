import { NextFunction, Request, Response } from "express";
import AuthService from "../services/auth.service";

const service = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.login(req.body);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    req.session.user = user;

    if (req.body.rememberMe) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 วัน
    } else {
      req.session.cookie.expires = undefined;
    }

    res.json({
      success: true,
      message: "Login success",
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export function me(req: Request, res: Response) {
  if (!req.session.user) {
    return res.status(401).json({ message: "not logged in" });
  }

  res.json(req.session.user);
}

export function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.json({
      success: true,
      message: "Logged out",
    });
  });
}
