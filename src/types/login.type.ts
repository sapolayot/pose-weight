export interface CreateLoginRequest {
  name: string;

  email: string;
}

export interface UpdateLoginRequest {
  name: string;

  email: string;
}

export interface LoginResponse {
  id: number;

  name: string;

  email: string;

  createdAt: Date;

  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;

  message: string;

  data?: T;
}
