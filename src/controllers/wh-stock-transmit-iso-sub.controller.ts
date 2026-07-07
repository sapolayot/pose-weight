import { NextFunction, Request, Response } from "express";
import WhStockTransmitIsoSubService from "../services/wh-stock-transmit-iso-sub.service";

const service = new WhStockTransmitIsoSubService();

export async function getByDocNo(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const docNo = typeof req.params.docNo === "string" ? req.params.docNo : "";

    console.log("docNo", docNo);

    const data = await service.getByDocNo(docNo);

    res.json({
      success: true,
      message: "Product list loaded",
      data,
    });
  } catch (err) {
    next(err);
  }
}
