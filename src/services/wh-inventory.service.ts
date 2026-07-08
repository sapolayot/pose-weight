import WhStockTransmitSubIso from "../models/wh-stock-transmit-iso-sub.model";
import WhInventorySqlRepository from "../repositories/sql/wh-inventory.repository-sql";
import { ProductionListItem } from "../types/wh-stock-transmit-iso-sub.type";

export default class WhInventoryService {
  private repo = new WhInventorySqlRepository();

  async getInventoryByCodeAndItemCode(
    invCode: string,
    itemCode: string,
  ): Promise<ProductionListItem[]> {
    const rows = await this.repo.getByInvCodeAndItemCode(invCode, itemCode);

    return rows.map((row) =>
      new WhStockTransmitSubIso(row).toProductionListItem(),
    );
  }
}
