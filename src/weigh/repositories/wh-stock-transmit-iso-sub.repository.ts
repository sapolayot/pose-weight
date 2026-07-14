import { WhStockTransmitIsoSubRecord } from "../types/wh-stock-transmit-iso-sub.type";

export default interface WhStockTransmitIsoSubRepository {
  getByDocNo(docNo: string): Promise<WhStockTransmitIsoSubRecord[]>;
}
