import WhStockTransmitIso from "../models/wh-stock-transmit-iso.model";
import WhStockTransmitIsoSqlRepository from "../repositories/sql/wh-stock-transmit-iso-sql.repository";
import type {
  ProductionListItem,
  WhStockTransmitIsoSearchQuery,
} from "../types/wh-stock-transmit-iso.type";

export default class WhStockTransmitIsoService {
  private repo = new WhStockTransmitIsoSqlRepository();

  async searchProductionList(
    params: WhStockTransmitIsoSearchQuery = {},
  ): Promise<ProductionListItem[]> {
    const query = params.q?.trim() ?? "";
    const limit = params.limit ?? 10;
    const page = params.page ?? 1;
    const status = params.status ?? undefined;

    const rows = await this.repo.searchActive(query, limit, status, page);

    return rows.map((row) =>
      new WhStockTransmitIso(row).toProductionListItem(),
    );
  }
}
