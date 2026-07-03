export default class Login {
  id?: number;

  name: string;

  username: string;

  password?: string;

  createdAt?: Date;

  updatedAt?: Date;

  constructor(data: Partial<Login> = {}) {
    this.id = data.id;
    this.name = data.name ?? "";
    this.password = data.password ?? "";
    this.username = data.username ?? "";
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
