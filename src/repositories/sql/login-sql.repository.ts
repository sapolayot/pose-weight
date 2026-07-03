import { ResultSetHeader, RowDataPacket } from "mysql2";

import pool from "../../config/database.config";
import Login from "../../models/login.model";
import { CreateLoginRequest, UpdateLoginRequest } from "../../types/login.type";
import LoginRepository from "../login.repository";

export default class LoginSqlRepository implements LoginRepository {
  async findAll(): Promise<Login[]> {
    const sql = `
            SELECT
                id,
                name,
                email,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM login
            ORDER BY id DESC
        `;

    const [rows] = await pool.query<(RowDataPacket & Partial<Login>)[]>(sql);
    return rows.map((row) => new Login(row));
  }

  async findById(id: number): Promise<Login | null> {
    const sql = `
            SELECT
                id,
                name,
                email,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM login
            WHERE id = ?
        `;

    const [rows] = await pool.query<(RowDataPacket & Partial<Login>)[]>(sql, [
      id,
    ]);

    if (rows.length === 0) {
      return null;
    }

    return new Login(rows[0]);
  }

  async findByEmail(email: string): Promise<Login | null> {
    const sql = `
            SELECT
                id,
                name,
                email,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM login
            WHERE email = ?
        `;

    const [rows] = await pool.query<(RowDataPacket & Partial<Login>)[]>(sql, [
      email,
    ]);

    if (rows.length === 0) {
      return null;
    }

    return new Login(rows[0]);
  }

  async create(request: CreateLoginRequest): Promise<number> {
    const sql = `
            INSERT INTO login
            (
                name,
                email
            )
            VALUES
            (
                ?,
                ?
            )
        `;

    const [result] = await pool.execute<ResultSetHeader>(sql, [
      request.name,
      request.email,
    ]);

    return result.insertId;
  }

  async update(id: number, request: UpdateLoginRequest): Promise<boolean> {
    const sql = `
            UPDATE login
            SET
                name = ?,
                email = ?
            WHERE id = ?
        `;

    const [result] = await pool.execute<ResultSetHeader>(sql, [
      request.name,
      request.email,
      id,
    ]);

    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const sql = `
            DELETE
            FROM login
            WHERE id = ?
        `;

    const [result] = await pool.execute<ResultSetHeader>(sql, [id]);

    return result.affectedRows > 0;
  }
}
