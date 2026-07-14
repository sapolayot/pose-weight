export interface WeighingMachineRecord {
  id: number;
  machineName: string;
  qrCode: string;
  maxCapacity: number;
  minCapacity: number;
  accuracyType: number;
  accuracyValue: number;
  isGross: number;
  isTare: number;
  isZero: number;
  isCancel: number;
}

export interface WeighingMachineDto {
  id: number;
  machineName: string;
  qrCode: string;
  maxCapacity: number;
  minCapacity: number;
  accuracyType: number;
  accuracyValue: number;
  isGross: number;
  isTare: number;
  isZero: number;
  isCancel: number;
}
