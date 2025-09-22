export const environment = {
  production: false,
  apiUrl: "https://localhost:7098",
  Login: "/auth/login",
  Register: "/auth/register",
  Logout: "/auth/logout",
  GetOwnCustomerData: "/customers/GetOwnCustomerData",
  CreateCustomer: "/customers/CreateCustomer",
  UpdateIncomeMonthly: "/customers/UpdateIncomeMonthly",
  SendLoanRequest: "/loan-applications/SendLoanRequest",
  GetLoanRequested: `/loan-applications/GetLoanRequested`,
  DecideLoan: "/loan-applications/:id/decision",
  GetLoans: "/loan-applications/GetLoans",
};
