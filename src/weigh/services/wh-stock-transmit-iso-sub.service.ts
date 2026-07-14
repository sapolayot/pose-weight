import WhStockTransmitSubIso from "../models/wh-stock-transmit-iso-sub.model";
import WhStockTransmitIsoSubSqlRepository from "../repositories/sql/wh-stock-transmit-iso-sub-sql.repository";
import { ProductionListItem } from "../types/wh-stock-transmit-iso-sub.type";

export default class WhStockTransmitIsoSubService {
  private repo = new WhStockTransmitIsoSubSqlRepository();

  async getByDocNo(docNo: string): Promise<ProductionListItem[]> {
    const rows = await this.repo.getByDocNo(docNo);

    return rows.map((row) =>
      new WhStockTransmitSubIso(row).toProductionListItem(),
    );
  }
}
