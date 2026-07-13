import WeighingMachine from "../models/weighing.model";
import WeighingMachineSqlRepository from "../repositories/sql/weighing-machine-sql.repository";
import { WeighingMachineDto } from "../types/weighing-machine.type";

export default class WeighingMachineService {
  private repo = new WeighingMachineSqlRepository();

  async getList(): Promise<WeighingMachineDto[]> {
    const rows = await this.repo.getList();

    return rows.map((row) => new WeighingMachine(row).toListDto());
  }

  async getListByQrCode(qrCode: string): Promise<WeighingMachineDto[]> {
    const rows = await this.repo.getListByQrCode(qrCode);

    return rows.map((row) => new WeighingMachine(row).toListDto());
  }
}
