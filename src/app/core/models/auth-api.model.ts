export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChildLoginRequest {
  code: string;
}

export interface UpdateProfileRequest {
  fullName: string;
}

export interface ChildProfileResponse {
  id: number;
  name: string;
  parentId: string;
}

export interface UpdateChildProfileRequest {
  name: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
}

export interface UserProfileResponse {
  fullName: string;
  email: string;
  role: string;
}
