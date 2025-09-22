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

export interface ILoginRequest {
  username: string;
  password: string;
}

export interface ILoginResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  token_type: string;
  not_before_policy?: number;
  session_state?: string;
  scope?: string;
}

export interface IRegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface IRegisterResponse {
  id?: string | number;
  user?: any;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  message?: string;
}

export interface ILoan {
  applicationId: string;
  customerId: string;
  amount: number;
  months: number;
  purpose: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  score: number;
  apr: number;
  monthlyPayment: number;
}

export interface ILoansPage {
  page: number;
  pageSize: number;
  total: number;
  items: ILoan[];
}

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: any;
  hasToken: boolean;
  params?: Record<string, string | number | boolean | null | undefined>;
  _retry?: boolean;
}

export interface ICustomer {
  id?: string | number;
  customerId?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
  [k: string]: any;
}

export interface ISendLoanRequest {
  customerId?: string;
  amount: number;
  months: number;
  purpose: string;
}

export interface ISendLoanResponse {
  applicationId?: string;
  status?:
    | "SUBMITTED"
    | "PENDING"
    | "APPROVED"
    | "DECLINED"
    | "REJECTED"
    | string;
  [k: string]: any;
}

export interface ICreateCustomerRequest {
  firstName: string;
  lastName: string;
  fiscalCode: string;
  incomeMonthly: number;
}

export interface ILoanDecisionResponse {
  status:
    | "APPROVED"
    | "PENDING"
    | "DECLINED"
    | "REJECTED"
    | "SUBMITTED"
    | string;
  apr: number;
  monthlyPayment: number;
  score: number;
}

export interface ISendLoanAndDecisionResponse extends ISendLoanResponse {
  decision: ILoanDecisionResponse;
}

export interface ILogoutRequest {
  refreshToken: string;
}
export interface ILogoutResponse {
  message?: string;
}

export interface IUpdateTokenRequest {
  refreshToken: string;
}

export interface IUpdateTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  refresh_expires_in?: number;
}
