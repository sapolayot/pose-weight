import Login from "../models/login.model";

export default interface AuthRepository {
  findByUsername(username: string): Promise<Login | null>;
}
