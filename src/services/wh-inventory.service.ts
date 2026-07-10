import WhInventory from "../models/wh-inventory.model";
import WhInventorySqlRepository from "../repositories/sql/wh-inventory.repository-sql";
import type { WhInventoryDto } from "../types/wh-inventory.type";

export default class WhInventoryService {
  private repo = new WhInventorySqlRepository();

  async getInventoryByCodeAndItemCode(
    invCode: string,
    itemCode: string,
  ): Promise<WhInventoryDto[]> {
    const rows = await this.repo.getByInvCodeAndItemCode(invCode, itemCode);

    return rows.map((row) => new WhInventory(row).toListDto());
  }
}
