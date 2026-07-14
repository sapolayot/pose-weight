import { RowDataPacket } from "mysql2";
import pool from "../../../master/config/database.config";
import { CoaApproveRecord } from "../../types/coa-approve.type";
import CoaApproveRepository from "../coa-approve.repository";

interface CoaApproveRow extends RowDataPacket {
  id: number;
  fName: string;
  fNameTh: string;
}

export default class CoaApproveSqlRepository implements CoaApproveRepository {
  async getList(): Promise<CoaApproveRecord[]> {
    const sql = `
        SELECT
          coa_approve.Id as id,
          coa_approve.FName as fName,
          coa_approve.FNameTH as fNameTh
        FROM coa_approve
        WHERE coa_approve.IsCancel = 0
        AND coa_approve.IsCancel = 0
   `;

    const [rows] = await pool.query<CoaApproveRow[]>(sql);

    return rows.map((row) => ({
      id: row.id,
      fName: row.fName,
      fNameTh: row.fNameTh,
    }));
  }
}
