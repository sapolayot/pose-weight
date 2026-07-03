export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * ข้อมูล user ที่เก็บใน session
 */
export interface SessionUser {
  id: number;
  name: string;
  username: string;
}

/**
 * Response ตอน login สำเร็จ
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  data: SessionUser;
}

/**
 * Response ทั่วไปของ auth
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
