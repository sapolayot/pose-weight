import {
  WeighingMachineDto,
  WeighingMachineRecord,
} from "../types/weighing-machine.type";

export default class WeighingMachine implements WeighingMachineRecord {
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

  constructor(data: Partial<WeighingMachineRecord> = {}) {
    this.id = data.id ?? 0;
    this.machineName = data.machineName ?? "";
    this.qrCode = data.qrCode ?? "";
    this.maxCapacity = Number(data.maxCapacity ?? 0);
    this.minCapacity = Number(data.minCapacity ?? 0);
    this.accuracyType = Number(data.accuracyType ?? 0);
    this.accuracyValue = Number(data.accuracyValue ?? 0);
    this.isGross = Number(data.isGross ?? 0);
    this.isTare = Number(data.isTare ?? 0);
    this.isZero = Number(data.isZero ?? 0);
    this.isCancel = Number(data.isCancel ?? 0);
  }

  toListDto(): WeighingMachineDto {
    return {
      id: this.id,
      machineName: this.machineName,
      qrCode: this.qrCode,
      maxCapacity: this.maxCapacity,
      minCapacity: this.minCapacity,
      accuracyType: this.accuracyType,
      accuracyValue: this.accuracyValue,
      isGross: this.isGross,
      isTare: this.isTare,
      isZero: this.isZero,
      isCancel: this.isCancel,
    };
  }
}
