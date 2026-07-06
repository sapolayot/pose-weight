import { RowDataPacket } from "mysql2";
import pool from "../../config/database.config";
import AuthRepository from "../auth.repository";

interface AuthUserRow extends RowDataPacket {
  loginCode: number;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
}

export interface AuthUserRecord {
  loginCode: number;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
}

export default class AuthSqlRepository implements AuthRepository {
  async findByUsername(username: string): Promise<AuthUserRecord | null> {
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

    const [rows] = await pool.query<AuthUserRow[]>(sql, [username]);

    if (rows.length === 0) return null;

    const row = rows[0];

    return {
      loginCode: row.loginCode,
      firstName: row.firstName,
      lastName: row.lastName,
      username: row.username,
      password: row.password,
      email: row.email,
    };
  }
}
