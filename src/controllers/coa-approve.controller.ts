import { NextFunction, Request, Response } from "express";
import WeighingMachineService from "../services/coa-approve.service";

const service = new WeighingMachineService();

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getList();

    res.json({
      success: true,
      message: "Coa approve list loaded",
      data,
    });
  } catch (err) {
    next(err);
  }
}
