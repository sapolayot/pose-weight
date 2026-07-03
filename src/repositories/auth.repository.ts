import User from "../models/login.model";

export default interface AuthRepository {
  findByUsername(username: string): Promise<User | null>;
}
