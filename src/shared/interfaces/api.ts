export interface ApiResponse<T> {
  status: number;
  data: T;
}

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: any;
  hasToken: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  token_type: string;
  not_before_policy?: number;
  session_state?: string;
  scope?: string;
}
