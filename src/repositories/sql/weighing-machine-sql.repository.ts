import { RowDataPacket } from "mysql2";
import pool from "../../config/database.config";
import { WeighingMachineRecord } from "../../types/weighing-machine.type";
import WeighingMachineRepository from "../weighing-machine.repository";

interface WeighingMachineRow extends RowDataPacket {
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

export default class WeighingMachineSqlRepository implements WeighingMachineRepository {
  async getList(): Promise<WeighingMachineRecord[]> {
    const sql = `
        SELECT
        weighing_machine.Id as id,
        weighing_machine.Machine_Name as machineName,
        weighing_machine.Qrcode as qrCode,
        weighing_machine.Max_Capacity as maxCapacity,
        weighing_machine.Min_Capacity as minCapacity,
        weighing_machine.Accuracy_Type as accuracyType,
        weighing_machine.Accuracy_Value as accuracyValue,
        weighing_machine.IsGross as isGross,
        weighing_machine.IsTare as isTare,
        weighing_machine.IsZero as isZero,
        weighing_machine.IsCancel as isCancel
        FROM weighing_machine
        WHERE weighing_machine.IsCancel = 0
    `;
    const [rows] = await pool.query<WeighingMachineRow[]>(sql);
    return rows.map((row) => ({
      id: row.id,
      machineName: row.machineName,
      qrCode: row.qrCode,
      maxCapacity: row.maxCapacity,
      minCapacity: row.minCapacity,
      accuracyType: row.accuracyType,
      accuracyValue: row.accuracyValue,
      isGross: row.isGross,
      isTare: row.isTare,
      isZero: row.isZero,
      isCancel: row.isCancel,
    }));
  }

  async getListByQrCode(qrCode: string): Promise<WeighingMachineRecord[]> {
    const sql = `
        SELECT
        weighing_machine.Id as id,
        weighing_machine.Machine_Name as machineName,
        weighing_machine.Qrcode as qrCode,
        weighing_machine.Max_Capacity as maxCapacity,
        weighing_machine.Min_Capacity as minCapacity,
        weighing_machine.Accuracy_Type as accuracyType,
        weighing_machine.Accuracy_Value as accuracyValue,
        weighing_machine.IsGross as isGross,
        weighing_machine.IsTare as isTare,
        weighing_machine.IsZero as isZero,
        weighing_machine.IsCancel as isCancel
        FROM weighing_machine
        WHERE weighing_machine.IsCancel = 0
        AND weighing_machine.Qrcode = ?
    `;
    const [rows] = await pool.query<WeighingMachineRow[]>(sql, [qrCode]);
    return rows.map((row) => ({
      id: row.id,
      machineName: row.machineName,
      qrCode: row.qrCode,
      maxCapacity: row.maxCapacity,
      minCapacity: row.minCapacity,
      accuracyType: row.accuracyType,
      accuracyValue: row.accuracyValue,
      isGross: row.isGross,
      isTare: row.isTare,
      isZero: row.isZero,
      isCancel: row.isCancel,
    }));
  }
}
