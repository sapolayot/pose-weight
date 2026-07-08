import type {
  ProductionListItem,
  WhStockTransmitIsoSubRecord,
} from "../types/wh-stock-transmit-iso-sub.type";

export default class WhStockTransmitIsoSub implements WhStockTransmitIsoSubRecord {
  id: string;
  rowNo: number;
  prefixName: string;
  barcode: string;
  nameTh: string;
  itemCode: string;
  docNo: string;
  mfgDate: string;
  expDate: string;
  status: number;
  unitName: string;
  invCode: string;
  lotNo: string;
  refCode: string;
  qty: number;
  qtyTmp: number;
  isMaster: number;
  qtyImport: number;
  grp1: number;
  multiplierValue: number;
  unitCode: string;
  unitAltName: string;
  bomQty: number;
  sumQty: number;

  constructor(data: Partial<WhStockTransmitIsoSubRecord> = {}) {
    this.id = data.id ?? "";
    this.rowNo = data.rowNo ?? 0;
    this.prefixName = data.prefixName ?? "";
    this.barcode = data.barcode ?? "";
    this.nameTh = data.nameTh ?? "";
    this.itemCode = data.itemCode ?? "";
    this.docNo = data.docNo ?? "";
    this.mfgDate = data.mfgDate ?? "";
    this.expDate = data.expDate ?? "";
    this.status = data.status ?? 0;
    this.unitName = data.unitName ?? "";
    this.invCode = data.invCode ?? "";
    this.lotNo = data.lotNo ?? "";
    this.refCode = data.refCode ?? "";
    this.qty = Number(data.qty ?? 0);
    this.qtyTmp = Number(data.qtyTmp ?? 0);
    this.isMaster = Number(data.isMaster ?? 0);
    this.qtyImport = Number(data.qtyImport ?? 0);
    this.grp1 = Number(data.grp1 ?? 0);
    this.multiplierValue = Number(data.multiplierValue ?? 0);
    this.unitCode = data.unitCode ?? "";
    this.unitAltName = data.unitAltName ?? "";
    this.bomQty = Number(data.bomQty ?? 0);
    this.sumQty = Number(data.sumQty ?? 0);
  }

  toProductionListItem(): ProductionListItem {
    return {
      id: this.id,
      rowNo: this.rowNo,
      prefixName: this.prefixName,
      barcode: this.barcode,
      nameTh: this.nameTh,
      itemCode: this.itemCode,
      docNo: this.docNo,
      mfgDate: this.mfgDate,
      expDate: this.expDate,
      invCode: this.invCode,
      lotNo: this.lotNo,
      refCode: this.refCode,
      status: this.status,
      qty: this.qty,
      qtyTmp: this.qtyTmp,
      isMaster: this.isMaster,
      qtyImport: this.qtyImport,
      grp1: this.grp1,
      multiplierValue: this.multiplierValue,
      unitCode: this.unitCode,
      unitName: this.unitName,
      unitAltName: this.unitAltName,
      bomQty: this.bomQty,
      sumQty: this.sumQty,
    };
  }
}
