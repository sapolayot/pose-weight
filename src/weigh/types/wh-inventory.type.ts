export interface WhInventoryRecord {
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
}

export interface WhInventoryDto {
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
}
