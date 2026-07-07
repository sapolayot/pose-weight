import { NextFunction, Request, Response } from "express";
import WhStockTransmitIsoService from "../services/wh-stock-transmit-iso.service";

const service = new WhStockTransmitIsoService();

export async function searchWhStockTransmitIso(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const limit =
      typeof req.query.limit === "string"
        ? Number.parseInt(req.query.limit, 10)
        : 200;
    const statusParam =
      typeof req.query.status === "string" ? req.query.status : undefined;
    let status: number | undefined;

    if (statusParam === "0") {
      status = 0;
    } else if (statusParam === "1") {
      status = 1;
    }

    const data = await service.searchProductionList({
      q,
      limit: Number.isFinite(limit) ? limit : 200,
      status,
    });

    res.json({
      success: true,
      message: "Production list loaded",
      data,
    });
  } catch (err) {
    next(err);
  }
}
