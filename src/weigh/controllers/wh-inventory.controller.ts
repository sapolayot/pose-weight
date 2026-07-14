import { NextFunction, Request, Response } from "express";
import WhInventoryService from "../services/wh-inventory.service";

const service = new WhInventoryService();

export async function getInventoryByCodeAndItemCode(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const itemCode =
      typeof req.query.itemCode === "string" ? req.query.itemCode : "";
    const invCode =
      typeof req.query.invCode === "string" ? req.query.invCode : "";

    const data = await service.getInventoryByCodeAndItemCode(invCode, itemCode);

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
