import Login from "../models/login.model";
import { CreateLoginRequest, UpdateLoginRequest } from "../types/login.type";

export default interface LoginRepository {
  /**
   * ดึงผู้ใช้ทั้งหมด
   */
  findAll(): Promise<Login[]>;

  /**
   * ดึงผู้ใช้ตาม ID
   */
  findById(id: number): Promise<Login | null>;

  /**
   * ดึงผู้ใช้ตาม Email
   */
  findByEmail(email: string): Promise<Login | null>;

  /**
   * เพิ่มผู้ใช้
   */
  create(request: CreateLoginRequest): Promise<number>;

  /**
   * แก้ไขผู้ใช้
   */
  update(id: number, request: UpdateLoginRequest): Promise<boolean>;

  /**
   * ลบผู้ใช้
   */
  delete(id: number): Promise<boolean>;
}
