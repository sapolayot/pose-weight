import User from "../models/login.model";
import LoginSqlRepository from "../repositories/sql/login-sql.repository";
import { CreateLoginRequest, UpdateLoginRequest } from "../types/login.type";

export default class UserService {
  private readonly loginSqlRepository: LoginSqlRepository;

  constructor() {
    this.loginSqlRepository = new LoginSqlRepository();
  }

  async getAll(): Promise<User[]> {
    return await this.loginSqlRepository.findAll();
  }

  async getById(id: number): Promise<User> {
    const user = await this.loginSqlRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async create(request: CreateLoginRequest): Promise<User> {
    const exists = await this.loginSqlRepository.findByEmail(request.email);

    if (exists) {
      throw new Error("Email already exists");
    }

    const id = await this.loginSqlRepository.create(request);

    const user = await this.loginSqlRepository.findById(id);

    if (!user) {
      throw new Error("Unable to create user");
    }

    return user;
  }

  async update(id: number, request: UpdateLoginRequest): Promise<User> {
    const user = await this.loginSqlRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    const emailOwner = await this.loginSqlRepository.findByEmail(request.email);

    if (emailOwner && emailOwner.loginCode !== id) {
      throw new Error("Email already exists");
    }

    const success = await this.loginSqlRepository.update(id, request);

    if (!success) {
      throw new Error("Unable to update user");
    }

    const updatedUser = await this.loginSqlRepository.findById(id);

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }

  async delete(id: number): Promise<void> {
    const user = await this.loginSqlRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    const success = await this.loginSqlRepository.delete(id);

    if (!success) {
      throw new Error("Unable to delete user");
    }
  }
}
