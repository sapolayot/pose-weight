export interface WhStockTransmitIsoRecord {
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
}

export interface ProductionListItem {
  id: string;
  productCode: string;
  name: string;
  lot: string;
  doc: string;
  date: string;
  amount: string;
  unit: string;
  displayStatus: string;
  detail: string;
  docDate: string;
  expDate: string;
  printDate: string;
  receiveDate: string;
}

export interface WhStockTransmitIsoSearchQuery {
  q?: string;
  limit?: number;
}
