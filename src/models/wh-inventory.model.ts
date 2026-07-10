import { WhInventoryDto, WhInventoryRecord } from "../types/wh-inventory.type";

export default class WhInventory implements WhInventoryRecord {
  invCode: string;
  itemCode: string;
  refCode: string;
  lotNo: string;
  mfgDate: string;
  expDate: string;
  dayDiff: number;
  price: number;
  qty: number;
  shelfCode: string;
  nameTh: string;
  barcode: string;
  nameEn: string;
  isDetention: number;

  constructor(data: Partial<WhInventoryRecord> = {}) {
    this.invCode = data.invCode ?? "";
    this.itemCode = data.itemCode ?? "";
    this.refCode = data.refCode ?? "";
    this.lotNo = data.lotNo ?? "";
    this.mfgDate = data.mfgDate ?? "";
    this.expDate = data.expDate ?? "";
    this.dayDiff = Number(data.dayDiff ?? 0);
    this.price = Number(data.price ?? 0);
    this.qty = Number(data.qty ?? 0);
    this.shelfCode = data.shelfCode ?? "";
    this.nameTh = data.nameTh ?? "";
    this.barcode = data.barcode ?? "";
    this.nameEn = data.nameEn ?? "";
    this.isDetention = Number(data.isDetention ?? 0);
  }

  toListDto(): WhInventoryDto {
    return {
      invCode: this.invCode,
      itemCode: this.itemCode,
      refCode: this.refCode,
      lotNo: this.lotNo,
      mfgDate: this.mfgDate,
      expDate: this.expDate,
      dayDiff: this.dayDiff,
      price: this.price,
      qty: this.qty,
      shelfCode: this.shelfCode,
      nameTh: this.nameTh,
      barcode: this.barcode,
      nameEn: this.nameEn,
      isDetention: this.isDetention,
    };
  }
}
