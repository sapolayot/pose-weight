import dotenv from "dotenv";
import mysql, { Pool } from "mysql2/promise";

dotenv.config();

const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  charset: "utf8mb4",
});

export default pool;

/**
 * ทดสอบการเชื่อมต่อฐานข้อมูล
 */
export async function testConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();

    console.log("=================================");
    console.log("MySQL Connected");
    console.log(`Database : ${process.env.DB_NAME}`);
    console.log(`Host     : ${process.env.DB_HOST}`);
    console.log("=================================");

    connection.release();
  } catch (error) {
    console.error("MySQL Connection Error");
    console.error(error);
    process.exit(1);
  }
}
