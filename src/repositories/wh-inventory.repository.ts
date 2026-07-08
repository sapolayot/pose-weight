import { WhInventoryRecord } from "../types/wh-inventory.type";

export default interface WhInventoryRepository {
  getByInvCodeAndItemCode(
    code: string,
    itemCode: string,
  ): Promise<WhInventoryRecord[]>;
}
