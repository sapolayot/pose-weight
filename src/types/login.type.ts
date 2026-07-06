export interface CreateLoginRequest {
  name: string;

  email: string;
}

export interface UpdateLoginRequest {
  name: string;

  email: string;
}

export interface LoginResponse {
  loginCode: number;

  firstName: string;

  email: string;
}

export interface ApiResponse<T> {
  success: boolean;

  message: string;

  data?: T;
}
