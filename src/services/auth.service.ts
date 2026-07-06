import AuthSqlRepository from "../repositories/sql/auth-sql.repository";
import { LoginRequest } from "../types/auth.type";

export default class AuthService {
  private repo = new AuthSqlRepository();

  async login(request: LoginRequest) {
    const user = await this.repo.findByUsername(request.username);

    if (!user) {
      throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    if (user.password !== request.password) {
      throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
    };
  }
}
