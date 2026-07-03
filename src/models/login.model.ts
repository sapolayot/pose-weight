export default class Login {
  id?: number;

  name: string;

  // email: string;

  username: string;

  createdAt?: Date;

  updatedAt?: Date;

  constructor(data: Partial<Login> = {}) {
    this.id = data.id;
    this.name = data.name ?? "";
    // this.email = data.email ?? "";
    this.username = data.username ?? "";
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
