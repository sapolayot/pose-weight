import type { ProductionListItem, WhStockTransmitIsoRecord } from "../types/wh-stock-transmit-iso.type";

function formatListAmount(value: number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default class WhStockTransmitIso implements WhStockTransmitIsoRecord {
  docNo: string;
  docDate: string;
  detail: string;
  status: number;
  manufacturingName: string;
  manufacturingValue: number;
  manufacturingUnit: string;
  manufacturingLotNo: string;
  displayStatus: string;
  mfgDate: string;
  expDate: string;
  printDate: string;
  receiveDate: string;
  unitName: string;

  constructor(data: Partial<WhStockTransmitIsoRecord> = {}) {
    this.docNo = data.docNo ?? "";
    this.docDate = data.docDate ?? "";
    this.detail = data.detail ?? "";
    this.status = data.status ?? 0;
    this.manufacturingName = data.manufacturingName ?? "";
    this.manufacturingValue = Number(data.manufacturingValue ?? 0);
    this.manufacturingUnit = data.manufacturingUnit ?? "";
    this.manufacturingLotNo = data.manufacturingLotNo ?? "";
    this.displayStatus = data.displayStatus ?? "";
    this.mfgDate = data.mfgDate ?? "";
    this.expDate = data.expDate ?? "";
    this.printDate = data.printDate ?? "";
    this.receiveDate = data.receiveDate ?? "";
    this.unitName = data.unitName ?? "";
  }

  get productCode(): string {
    const trimmed = this.manufacturingName.trim();
    if (!trimmed) return this.docNo;

    const [code] = trimmed.split(":");
    return code.trim() || trimmed;
  }

  get displayTitle(): string {
    const name = this.manufacturingName.trim();
    const detail = this.detail.trim();

    if (name && detail && !name.includes(detail)) {
      return `${name}: ${detail}`;
    }

    return name || detail || this.docNo;
  }

  get unitLabel(): string {
    return this.unitName.trim() || this.manufacturingUnit.trim() || "—";
  }

  toProductionListItem(): ProductionListItem {
    return {
      id: this.docNo || this.manufacturingLotNo,
      productCode: this.productCode,
      name: this.displayTitle,
      lot: this.manufacturingLotNo,
      doc: this.docNo,
      date: this.mfgDate || this.docDate,
      amount: formatListAmount(this.manufacturingValue),
      unit: this.unitLabel,
      displayStatus: this.displayStatus,
      detail: this.detail,
      docDate: this.docDate,
      expDate: this.expDate,
      printDate: this.printDate,
      receiveDate: this.receiveDate,
    };
  }
}
