export default class Login {
  loginCode?: number;

  firstName: string;

  lastName: string;

  username: string;

  password?: string;

  createdAt?: Date;

  updatedAt?: Date;

  constructor(data: Partial<Login> = {}) {
    this.loginCode = data.loginCode;
    this.firstName = data.firstName ?? "";
    this.lastName = data.lastName ?? "";
    this.password = data.password ?? "";
    this.username = data.username ?? "";
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
