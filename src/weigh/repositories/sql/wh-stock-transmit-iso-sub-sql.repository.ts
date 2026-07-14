import { RowDataPacket } from "mysql2";
import pool from "../../../master/config/database.config";
import { WhStockTransmitIsoSubRecord } from "../../types/wh-stock-transmit-iso-sub.type";
import WhStockTransmitIsoSubRepository from "../wh-stock-transmit-iso-sub.repository";

interface WhStockTransmitIsoSubRow extends RowDataPacket {
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
  qty: number;
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

export default class WhStockTransmitIsoSubSqlRepository implements WhStockTransmitIsoSubRepository {
  async getByDocNo(docNo: string): Promise<WhStockTransmitIsoSubRecord[]> {
    let sql = `
        SELECT    wh_stock_transmit_iso_sub.Id as id,  
          wh_stock_transmit_iso_sub.Row_No as rowNo,
          CASE WHEN item.Grp_1 = 2  THEN '(R)' ELSE '(P)' END AS prefixName,
          item.Barcode as barcode,  
          item.NameTH as nameTh,  
          wh_stock_transmit_iso_sub.Item_Code as itemCode,
          wh_stock_transmit_iso_sub.DocNo as docNo,
          wh_stock_transmit_iso_sub.MFGDate as mfgDate,  
          wh_stock_transmit_iso_sub.EXPDate as expDate,
          COALESCE(wh_stock_transmit_iso_sub.Inv_Code, '') AS invCode,
          COALESCE(wh_stock_transmit_iso_sub.LotNo, '') AS lotNo,  
          COALESCE( wh_inventory.DocCode , '') AS refCode,
          IF(wh_stock_transmit_iso_sub.Status,'1','0') AS status,
          wh_stock_transmit_iso_sub.Qty as qty,  
          wh_stock_transmit_iso_sub.Qty_tmp as qtyTmp,  
          IF(wh_stock_transmit_iso_sub.IsMaster,'1','0') AS isMaster,
          (
            CASE WHEN  wh_stock_transmit_iso_sub.IsMaster = 1 
            THEN  wh_stock_transmit_iso_sub.Qty_Import
            ELSE 
              COALESCE(
                (
                SELECT  w.Qty_Import
                FROM  wh_stock_transmit_iso_sub AS w 
                WHERE  w.DocNo = wh_stock_transmit_iso_sub.DocNo 
                AND  w.Item_Code = wh_stock_transmit_iso_sub.Item_Code
                LIMIT  1
                )
              , 0)
            END
          ) AS qtyImport,  
      
          item.Grp_1 as grp1,  
          item.MultiplierValue as multiplierValue,  
          item_unit.Unit_Code as unitCode,
          item_unit.Unit_Name as unitName,  
          item_unit2.Unit_Name AS unitAltName,
      
          (CASE WHEN item.Grp_1 = 2 
            THEN COALESCE(
              ( SELECT   bom_r.Qty 
                FROM   wh_stock_transmit_iso AS d
                
                INNER JOIN  item_manufacturing
                ON   item_manufacturing.ItemM_Name = d.Manufacturing_Name
                
                INNER JOIN  bom_r
                ON   bom_r.ItemM_Code = item_manufacturing.ItemM_Code
                
                WHERE   d.DocNo = wh_stock_transmit_iso_sub.DocNo 
                AND   bom_r.Item_Code_Bom = wh_stock_transmit_iso_sub.Item_Code 
                AND   item_manufacturing.Qty = wh_stock_transmit_iso.Manufacturing_Value
                AND   item_manufacturing.ItemM_Code = wh_stock_transmit_iso.ItemM_Code
                LIMIT   1 
              ),
            0) 
            ELSE  0 
            END
          ) AS bomQty,

          COALESCE(
            ( SELECT   SUM(ds.Qty) 
              FROM   wh_stock_transmit_iso_sub AS ds 
              WHERE   ds.DocNo = wh_stock_transmit_iso_sub.DocNo 
              AND   ds.Item_Code = wh_stock_transmit_iso_sub.Item_Code 
              GROUP BY   ds.Item_Code 
              LIMIT   1 
            ),
          0)  AS sumQty  

        FROM    wh_stock_transmit_iso_sub

        INNER JOIN  wh_stock_transmit_iso
        ON   wh_stock_transmit_iso.DocNo = wh_stock_transmit_iso_sub.DocNo

        INNER JOIN  item
        ON   item.Item_Code = wh_stock_transmit_iso_sub.Item_Code

        

        INNER JOIN  item_unit
        ON   item_unit.Unit_Code = item.Unit_Code

        INNER JOIN  item_unit AS item_unit2
        ON   item_unit2.Unit_Code = wh_stock_transmit_iso_sub.Unit_Code

      
        LEFT JOIN  wh_inventory
        ON   wh_inventory.Inv_Code = wh_stock_transmit_iso_sub.Inv_Code 

        WHERE  wh_stock_transmit_iso_sub.DocNo = ?

        AND   item.IsChangeBucket = 0
        AND   wh_stock_transmit_iso_sub.Is_Damages = 0

      ORDER BY  item.Grp_1 ASC, item.Barcode ASC, wh_stock_transmit_iso_sub.Qty DESC
   `;

    const [rows] = await pool.query<WhStockTransmitIsoSubRow[]>(sql, docNo);

    return rows.map((row) => ({
      id: row.id,
      rowNo: row.rowNo,
      prefixName: row.prefixName,
      barcode: row.barcode,
      nameTh: row.nameTh,
      itemCode: row.itemCode,
      docNo: row.docNo,
      mfgDate: row.mfgDate,
      expDate: row.expDate,
      invCode: row.invCode,
      lotNo: row.lotNo,
      refCode: row.refCode,
      status: row.status,
      qty: row.qty,
      qtyTmp: row.qtyTmp,
      isMaster: row.isMaster,
      qtyImport: row.qtyImport,
      grp1: row.grp1,
      multiplierValue: row.multiplierValue,
      unitCode: row.unitCode,
      unitName: row.unitName,
      unitAltName: row.unitAltName,
      bomQty: row.bomQty,
      sumQty: row.sumQty,
    }));
  }
}
