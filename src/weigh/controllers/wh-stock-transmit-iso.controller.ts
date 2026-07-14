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
        : 10;
    const page =
      typeof req.query.page === "string"
        ? Number.parseInt(req.query.page, 10)
        : 1;
    const statusParam =
      typeof req.query.status === "string" ? req.query.status : undefined;
    let status: number | undefined;

    if (statusParam === "0") {
      status = 0;
    } else if (statusParam === "1") {
      status = 1;
    }

    const safeLimit = Number.isFinite(limit) ? limit : 10;
    const safePage = Number.isFinite(page) ? page : 1;

    const data = await service.searchProductionList({
      q,
      limit: safeLimit,
      page: safePage,
      status,
    });

    res.json({
      success: true,
      message: "Production list loaded",
      limit: safeLimit,
      page: safePage,
      data,
    });
  } catch (err) {
    next(err);
  }
}
