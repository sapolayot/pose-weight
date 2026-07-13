import { WeighingMachineRecord } from "../types/weighing-machine.type";

export default interface WeighingMachineRepository {
  getList(): Promise<WeighingMachineRecord[]>;
  getListByQrCode(qrCode: string): Promise<WeighingMachineRecord[]>;
}
