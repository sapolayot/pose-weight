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

    const data = await service.searchProductionList({
      q,
      limit: Number.isFinite(limit) ? limit : 200,
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
