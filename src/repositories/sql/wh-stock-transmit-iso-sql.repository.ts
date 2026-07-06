import { RowDataPacket } from "mysql2";
import pool from "../../config/database.config";
import WhStockTransmitIsoRepository from "../wh-stock-transmit-iso.repository";
import type { WhStockTransmitIsoRecord } from "../../types/wh-stock-transmit-iso.type";

interface WhStockTransmitIsoRow extends RowDataPacket {
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

const BASE_SQL = `
  SELECT
    wh_stock_transmit_iso.DocNo AS docNo,
    DATE_FORMAT(wh_stock_transmit_iso.DocDate, '%d-%m-%Y') AS docDate,
    wh_stock_transmit_iso.Detail AS detail,
    wh_stock_transmit_iso.Status AS status,
    wh_stock_transmit_iso.Manufacturing_Name AS manufacturingName,
    wh_stock_transmit_iso.Manufacturing_Value AS manufacturingValue,
    wh_stock_transmit_iso.Manufacturing_Unit AS manufacturingUnit,
    wh_stock_transmit_iso.Manufacturing_LotNo AS manufacturingLotNo,
    wh_stock_transmit_iso.Display_Status AS displayStatus,
    DATE_FORMAT(wh_stock_transmit_iso.MFG_Date, '%d-%m-%Y') AS mfgDate,
    DATE_FORMAT(wh_stock_transmit_iso.EXP_Date, '%d-%m-%Y') AS expDate,
    DATE_FORMAT(wh_stock_transmit_iso.Print_Date, '%d-%m-%Y') AS printDate,
    DATE_FORMAT(wh_stock_transmit_iso.Receive_Date, '%d-%m-%Y') AS receiveDate,
    item_unit.Unit_Name AS unitName
  FROM wh_stock_transmit_iso
  LEFT JOIN item_unit
    ON item_unit.Unit_Code = wh_stock_transmit_iso.Manufacturing_Unit
  WHERE wh_stock_transmit_iso.Status = 0
`;

const SEARCH_SQL = `
  AND (
    wh_stock_transmit_iso.Manufacturing_LotNo LIKE ? OR
    wh_stock_transmit_iso.Detail LIKE ? OR
    wh_stock_transmit_iso.DocNo LIKE ? OR
    wh_stock_transmit_iso.Manufacturing_Name LIKE ?
  )
`;

const ORDER_SQL = `
  ORDER BY wh_stock_transmit_iso.DocNo DESC
  LIMIT ?
`;

export default class WhStockTransmitIsoSqlRepository
  implements WhStockTransmitIsoRepository
{
  async searchActive(
    query = "",
    limit = 200,
  ): Promise<WhStockTransmitIsoRecord[]> {
    const trimmedQuery = query.trim();
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const params: Array<string | number> = [];

    let sql = BASE_SQL;

    if (trimmedQuery) {
      sql += SEARCH_SQL;
      const pattern = `%${trimmedQuery}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += ORDER_SQL;
    params.push(safeLimit);

    const [rows] = await pool.query<WhStockTransmitIsoRow[]>(sql, params);

    return rows.map((row) => ({
      docNo: row.docNo,
      docDate: row.docDate,
      detail: row.detail,
      status: row.status,
      manufacturingName: row.manufacturingName,
      manufacturingValue: row.manufacturingValue,
      manufacturingUnit: row.manufacturingUnit,
      manufacturingLotNo: row.manufacturingLotNo,
      displayStatus: row.displayStatus,
      mfgDate: row.mfgDate,
      expDate: row.expDate,
      printDate: row.printDate,
      receiveDate: row.receiveDate,
      unitName: row.unitName,
    }));
  }
}
