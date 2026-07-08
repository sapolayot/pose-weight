import { RowDataPacket } from "mysql2";
import pool from "../../config/database.config";
import { WhInventoryRecord } from "../../types/wh-inventory.type";
import WhInventoryRepository from "../wh-inventory.repository";

interface WhInventoryRow extends RowDataPacket {
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

export default class WhInventorySqlRepository implements WhInventoryRepository {
  async getByInvCodeAndItemCode(
    code: string,
    itemCode: string,
  ): Promise<WhInventoryRecord[]> {
    let sql = `
       SELECT wh_inventory.Inv_Code as invCode,
              wh_inventory.Item_Code as itemCode,
              COALESCE(wh_inventory.Ref_Code,'') AS refCode,
              COALESCE(wh_inventory.LotNo,'') AS lotNo,
              wh_inventory.MFGDate as mfgDate,
              DATE_FORMAT(wh_inventory.EXPDate ,'%d-%m-%Y') AS expDate, 
              DATEDIFF(DATE(wh_inventory.EXPDate), DATE(NOW())) AS dayDiff,
              wh_inventory.Price as price,
              wh_inventory.Qty as qty,
              wh_inventory.Shelf_Code as shelfCode,
              item.NameTH as nameTh,
              item.Barcode as barcode,
              item.NameEN as nameEn,
              wh_inventory.IsDetention as isDetention
        FROM  wh_inventory 
        INNER JOIN  item 
        ON item.Item_Code = wh_inventory.Item_Code 
        WHERE  wh_inventory.Qty > 0
          AND wh_inventory.Item_Code = ?
          AND wh_inventory.Inv_Code = ?
        ORDER BY wh_inventory.Inv_Code DESC 
        LIMIT 1
   `;
    const [rows] = await pool.query<WhInventoryRow[]>(sql, [itemCode, code]);
    return rows.map((row) => ({
      invCode: row.invCode,
      itemCode: row.itemCode,
      refCode: row.refCode,
      lotNo: row.lotNo,
      mfgDate: row.mfgDate,
      expDate: row.expDate,
      dayDiff: row.dayDiff,
      price: row.price,
      qty: row.qty,
      shelfCode: row.shelfCode,
      nameTh: row.nameTh,
      barcode: row.barcode,
      nameEn: row.nameEn,
      isDetention: row.isDetention,
    }));
  }
}
