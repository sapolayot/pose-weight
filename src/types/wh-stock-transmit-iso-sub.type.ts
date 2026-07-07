export interface WhStockTransmitIsoSubRecord {
  id: string;
  rowNo: number;
  prefixName: string;
  barcode: string;
  nameTh: string;
  itemCode: string;
  docNo: string;
  mfgDate: string;
  expDate: string;
  invCode: string;
  lotNo: string;
  refCode: string;
  status: number;
  qtyTmp: number;
  isMaster: number;
  qtyImport: number;
  grp1: number;
  multiplierValue: number;
  unitCode: string;
  unitName: string;
  unitAltName: string;
  bomQty: number;
  sumQty: number;
}

export interface ProductionListItem {
  id: string;
  rowNo: number;
  prefixName: string;
  barcode: string;
  nameTh: string;
  itemCode: string;
  docNo: string;
  mfgDate: string;
  expDate: string;
  invCode: string;
  lotNo: string;
  refCode: string;
  status: number;
  qtyTmp: number;
  isMaster: number;
  qtyImport: number;
  grp1: number;
  multiplierValue: number;
  unitCode: string;
  unitName: string;
  unitAltName: string;
  bomQty: number;
  sumQty: number;
}
