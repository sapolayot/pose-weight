import { RowDataPacket } from "mysql2";
import pool from "../../config/database.config";
import Login from "../../models/login.model";
import AuthRepository from "../auth.repository";

export default class AuthSqlRepository implements AuthRepository {
  async findByUsername(username: string): Promise<Login | null> {
    const sql = `
            SELECT
                Login_Code as loginCode,
                FName as firstName,
                LName as lastName,
                Username as username,
                Password as password,
                Email as email
            FROM login
            WHERE Username = ?
            LIMIT 1
        `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, [username]);

    if (rows.length === 0) return null;

    return rows[0] as Login & { password: string };
  }
}
