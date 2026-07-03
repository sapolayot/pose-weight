import { NextFunction, Request, Response } from "express";

import LoginService from "../services/login.service";
import { CreateLoginRequest, UpdateLoginRequest } from "../types/login.type";

const loginService = new LoginService();

/**
 * GET /api/login
 */
export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const logins = await loginService.getAll();

    res.status(200).json({
      success: true,
      message: "Success",
      data: logins,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/login/:id
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    const login = await loginService.getById(id);

    res.status(200).json({
      success: true,
      message: "Success",
      data: login,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/login
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const request: CreateLoginRequest = req.body;

    const login = await loginService.create(request);

    res.status(201).json({
      success: true,
      message: "Login created successfully",
      data: login,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/login/:id
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    const request: UpdateLoginRequest = req.body;

    const login = await loginService.update(id, request);

    res.status(200).json({
      success: true,
      message: "Login updated successfully",
      data: login,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/login/:id
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    await loginService.delete(id);

    res.status(200).json({
      success: true,
      message: "Login deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
