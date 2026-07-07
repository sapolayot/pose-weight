import type { WhStockTransmitIsoRecord } from "../types/wh-stock-transmit-iso.type";

export default interface WhStockTransmitIsoRepository {
  searchActive(
    query?: string,
    limit?: number,
    status?: number,
  ): Promise<WhStockTransmitIsoRecord[]>;
}
