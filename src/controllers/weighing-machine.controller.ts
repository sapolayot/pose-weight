import { NextFunction, Request, Response } from "express";
import WeighingMachineService from "../services/weighing-machine.service";

const service = new WeighingMachineService();

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getList();

    res.json({
      success: true,
      message: "Product list loaded",
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getListByQrCode(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const qrCode =
      typeof req.params.qrCode === "string" ? req.params.qrCode : "";

    const data = await service.getListByQrCode(qrCode);

    if (data.length <= 0) {
      return res.json({
        success: false,
        message: "Not found",
        data,
      });
    }

    res.json({
      success: true,
      message: "Found",
      data,
    });
  } catch (err) {
    next(err);
  }
}
