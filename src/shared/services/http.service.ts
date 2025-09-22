import { inject, Injectable } from "@angular/core";
import {
  ApiRequestOptions,
  ApiResponse,
  ICreateCustomerRequest,
  ICustomer,
  ILoanDecisionResponse,
  ILoansPage,
  ILoginRequest,
  ILoginResponse,
  ILogoutResponse,
  IRegisterRequest,
  IRegisterResponse,
  ISendLoanAndDecisionResponse,
  ISendLoanRequest,
  ISendLoanResponse,
  IUpdateTokenRequest,
  IUpdateTokenResponse,
} from "../interfaces/api";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from "@angular/common/http";
import { async, lastValueFrom } from "rxjs";
import { environment } from "../../environments/environments";
import { LoaderService } from "./loader.service";
import { Router } from "@angular/router";
import { GlobalService } from "./global.service";

@Injectable({
  providedIn: "root",
})
export class HttpService {
  private http = inject(HttpClient);
  private fallbackBaseUrl = environment.apiUrl ?? "";

  constructor(
    private loader: LoaderService,
    private service: GlobalService,
    private router: Router
  ) {}

  navigateTo(url?: string): Promise<boolean> {
    if (url) {
      return this.router.navigateByUrl(url);
    }
    return Promise.resolve(false);
  }

  async handleLogin(creds?: {
    username: string;
    password: string;
  }): Promise<ApiResponse<ILoginResponse>> {
    const username = creds?.username ?? localStorage.getItem("username") ?? "";
    const password = creds?.password ?? localStorage.getItem("password") ?? "";

    if (!username || !password) {
      return Promise.reject({
        status: 400,
        data: { message: "Credenziali mancanti" } as any,
      });
    }

    const body: ILoginRequest = { username, password };
    this.loader.showLoading("Autenticazione…");

    try {
      const response = await this.apiRequest<ILoginResponse>({
        method: "POST",
        endpoint: environment.Login,
        body,
        hasToken: false,
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const { firstName, lastName } = this.getNamesFromJwt(access_token);
      if (firstName) localStorage.setItem("firstName", firstName);
      if (lastName) localStorage.setItem("lastName", lastName);

      if (!access_token) {
        return Promise.reject({
          status: 500,
        });
      }

      const expFromJwtMs = this.getExpiryFromJwt(access_token);
      const expiresAtMs =
        expFromJwtMs ??
        (typeof expires_in === "number"
          ? Date.now() + expires_in * 1000
          : null);

      this.setSession({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAtMs,
      });
      this.service.setLoans([]);
      this.navigateTo("/dashboard");
      return response;
    } catch (err) {
      const e = err as HttpErrorResponse | any;

      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0 ? "Impossibile contattare il server" : "Login fallito");

      console.error("Login failed:", e);
      this.loader.presentAlert("Errore", "Login non riuscito");

      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }

  async handleRegister(
    body: IRegisterRequest
  ): Promise<ApiResponse<IRegisterResponse>> {
    if (
      !body.username ||
      !body.email ||
      !body.password ||
      !body.firstName ||
      !body.lastName
    ) {
      return Promise.reject({
        status: 400,
        data: { message: "Campi di registrazione mancanti" } as any,
      });
    }
    this.loader.showLoading("Registrazione in corso...");

    try {
      const response = await this.apiRequest<IRegisterResponse>({
        method: "POST",
        endpoint: environment.Register,
        body,
        hasToken: false,
      });

      if (response.data?.access_token) {
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        const tokenType = response.data.token_type || "Bearer";
        const expiresIn = response.data.expires_in;

        const expFromJwtMs = this.getExpiryFromJwt(accessToken);
        const expiresAtMs =
          expFromJwtMs ??
          (typeof expiresIn === "number"
            ? Date.now() + expiresIn * 1000
            : null);

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("tokenType", tokenType);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        if (expiresAtMs)
          localStorage.setItem("tokenExpiry", String(expiresAtMs));
      }

      this.navigateTo("/dashboard");
      return response;
    } catch (err) {
      const e = err as HttpErrorResponse | any;

      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0
          ? "Impossibile contattare il server"
          : "Registrazione fallita");

      console.error("Registration failed:", e);
      this.loader.presentAlert(
        "Errore",
        `Registrazione non riuscita: ${message}`
      );

      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }

  private extractCustomerId(profile: any): string | null {
    return profile?.customerId ?? profile?.id ?? null;
  }

  private async ensureCustomerId(): Promise<string> {
    const cached = localStorage.getItem("customerId");
    if (cached) return cached;

    try {
      const res = await this.apiRequest<ICustomer>({
        method: "GET",
        endpoint: environment.GetOwnCustomerData,
        hasToken: true,
        _retry: true,
      });

      const cid = this.extractCustomerId(res.data);
      if (cid) {
        localStorage.setItem("customerId", cid);
        localStorage.setItem("user", JSON.stringify(res.data));
        return cid;
      }

      throw {
        status: 400,
        data: { message: "customerId non presente nella risposta profilo" },
      };
    } catch (e) {
      throw {
        status: 400,
        data: { message: "Impossibile ottenere customerId" },
      };
    }
  }

  async getLoans(args: {
    status?: string;
    customerId?: string | number;
    page?: number;
    pageSize?: number;
    sort?: string;
  }): Promise<ApiResponse<ILoansPage>> {
    const { status, page = 1, pageSize = 20, sort } = args ?? {};

    this.loader.showLoading("Recupero prestiti in corso...");

    try {
      const customerId = args?.customerId ?? (await this.ensureCustomerId()); // 👈 prende da me/LS

      const params: Record<string, string> = {
        customerId: String(customerId),
        page: String(page),
        pageSize: String(pageSize),
      };
      if (status) params["status"] = String(status);
      if (sort) params["sort"] = String(sort);

      const res = await this.apiRequest<ILoansPage>({
        method: "GET",
        endpoint: environment.GetLoans,
        hasToken: true,
        params,
      });

      return res;
    } catch (err) {
      const e = err as HttpErrorResponse | any;
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0
          ? "Impossibile contattare il server"
          : "Errore recupero loans");
      this.loader.presentAlert(
        "Errore",
        `Recupero prestiti non riuscito: ${message}`
      );
      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }

  async getOwnCustomerData(): Promise<ApiResponse<ICustomer>> {
    this.loader.showLoading("Carico i tuoi dati…");
    try {
      const res = await this.apiRequest<ICustomer>({
        method: "GET",
        endpoint: environment.GetOwnCustomerData,
        hasToken: true,
      });

      if (res?.data) {
        localStorage.setItem("user", JSON.stringify(res.data));
        const cid = this.extractCustomerId(res.data);
        if (cid) localStorage.setItem("customerId", cid);
      }

      return res;
    } catch (err) {
      const e = err as HttpErrorResponse | any;
      return Promise.reject({
        status: e?.status ?? 0,
        data: { message: e?.message } as any,
      });
    } finally {
      this.loader.hideLoading();
    }
  }

  async createCustomer(
    body: ICreateCustomerRequest
  ): Promise<ApiResponse<ICustomer>> {
    if (
      !body.firstName ||
      !body.lastName ||
      !body.fiscalCode ||
      body.incomeMonthly == null
    ) {
      return Promise.reject({
        status: 400,
        data: { message: "Dati cliente incompleti" } as any,
      });
    }

    this.loader.showLoading("Creazione profilo…");

    try {
      const res = await this.apiRequest<ICustomer>({
        method: "POST",
        endpoint: environment.CreateCustomer,
        hasToken: true,
        body,
      });

      if (res?.data) {
        const cid = this.extractCustomerId(res.data);
        if (cid) localStorage.setItem("customerId", cid);
        localStorage.setItem("user", JSON.stringify(res.data));
      }

      return res;
    } catch (err) {
      const e = err as HttpErrorResponse | any;
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0
          ? "Impossibile contattare il server"
          : "Creazione profilo fallita");
      this.loader.presentAlert("Errore", message);
      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }

  async sendLoanRequest(
    body: ISendLoanRequest
  ): Promise<ApiResponse<ISendLoanAndDecisionResponse>> {
    if (
      !body ||
      body.amount == null ||
      body.months == null ||
      !body.purpose?.trim()
    ) {
      return Promise.reject({
        status: 400,
        data: { message: "Dati richiesta prestito incompleti" } as any,
      });
    }

    this.loader.showLoading("Invio richiesta prestito…");

    try {
      const customerId =
        body.customerId ??
        localStorage.getItem("customerId") ??
        (await this.ensureCustomerId());

      const payload: ISendLoanRequest = {
        customerId,
        amount: body.amount,
        months: body.months,
        purpose: body.purpose.trim(),
      };

      const sendRes = await this.apiRequest<ISendLoanResponse>({
        method: "POST",
        endpoint: environment.SendLoanRequest,
        hasToken: true,
        body: payload,
      });

      const appId = sendRes?.data?.applicationId;
      if (!appId) {
        return Promise.reject({
          status: 500,
          data: { message: "ApplicationId assente nella risposta" } as any,
        });
      }

      const decideRes = await this.getLoanDecision(appId);

      const combined: ISendLoanAndDecisionResponse = {
        ...sendRes.data,
        decision: decideRes.data,
      };

      return { status: decideRes.status, data: combined };
    } catch (err) {
      const e = err as HttpErrorResponse | any;
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0
          ? "Impossibile contattare il server"
          : "Invio richiesta prestito fallito");

      this.loader.presentAlert(
        "Errore",
        `Non è stato possibile inviare/valutare la richiesta: ${message}`
      );
      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }

  private getNamesFromJwt(token: string): {
    firstName?: string;
    lastName?: string;
  } {
    try {
      const [, payload] = token.split(".");
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      );
      const firstName =
        decoded?.given_name ||
        decoded?.firstName ||
        decoded?.name?.split(" ")?.[0];
      const lastName =
        decoded?.family_name ||
        decoded?.lastName ||
        decoded?.name?.split(" ")?.slice(1).join(" ");
      return { firstName, lastName };
    } catch {
      return {};
    }
  }

  private buildDecideLoanEndpoint(applicationId: string): string {
    return environment.DecideLoan.replace(":id", applicationId);
  }

  async getLoanDecision(
    applicationId: string
  ): Promise<ApiResponse<ILoanDecisionResponse>> {
    if (!applicationId) {
      return Promise.reject({
        status: 400,
        data: { message: "applicationId mancante" } as any,
      });
    }

    try {
      const res = await this.apiRequest<ILoanDecisionResponse>({
        method: "POST",
        endpoint: this.buildDecideLoanEndpoint(applicationId),
        hasToken: true,
      });
      return res;
    } catch (err) {
      const e = err as HttpErrorResponse | any;
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0
          ? "Impossibile contattare il server"
          : "Decisione prestito fallita");
      this.loader.presentAlert(
        "Errore",
        `Decisione non disponibile: ${message}`
      );
      return Promise.reject({ status, data: { message } as any });
    }
  }

  async updateIncomeMonthly(
    incomeMonthly: number
  ): Promise<ApiResponse<ICustomer>> {
    if (incomeMonthly == null || isNaN(incomeMonthly) || incomeMonthly < 0) {
      return Promise.reject({
        status: 400,
        data: { message: "Valore entrate non valido" } as any,
      });
    }

    this.loader.showLoading("Aggiornamento entrate…");

    try {
      const res = await this.apiRequest<ICustomer>({
        method: "PUT",
        endpoint: environment.UpdateIncomeMonthly,
        hasToken: true,
        body: { incomeMonthly },
      });

      if (res?.data) {
        localStorage.setItem("user", JSON.stringify(res.data));
      } else {
        const userRaw = localStorage.getItem("user");
        if (userRaw) {
          try {
            const usr = JSON.parse(userRaw);
            usr.incomeMonthly = incomeMonthly;
            localStorage.setItem("user", JSON.stringify(usr));
          } catch {}
        }
      }

      this.loader.presentAlert("Fatto!", "Entrate mensili aggiornate.");
      return res;
    } catch (err) {
      const e = err as HttpErrorResponse | any;
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0
          ? "Impossibile contattare il server"
          : "Aggiornamento entrate fallito");
      this.loader.presentAlert("Errore", message);
      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }

  private refreshingPromise: Promise<boolean> | null = null;

  private getExpiryFromJwt(token: string): number | null {
    try {
      const [, payload] = token.split(".");
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      );
      return typeof decoded?.exp === "number" ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private setSession(opts: {
    accessToken: string;
    refreshToken?: string;
    expiresAtMs?: number | null;
    tokenType?: string;
  }) {
    localStorage.setItem("accessToken", opts.accessToken);
    if (opts.refreshToken !== undefined) {
      if (opts.refreshToken)
        localStorage.setItem("refreshToken", opts.refreshToken);
      else localStorage.removeItem("refreshToken");
    }
    if (opts.expiresAtMs !== undefined) {
      if (opts.expiresAtMs)
        localStorage.setItem("tokenExpiry", String(opts.expiresAtMs));
      else localStorage.removeItem("tokenExpiry");
    }
    if (opts.tokenType) localStorage.setItem("tokenType", opts.tokenType);
  }

  private async refreshViaBackend(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken") ?? "";
    if (!refreshToken) return false;

    if (this.refreshingPromise) return this.refreshingPromise;

    this.refreshingPromise = (async () => {
      try {
        const res = await this.apiRequest<IUpdateTokenResponse>({
          method: "POST",
          endpoint: environment.RefreshToken,
          hasToken: false,
          body: { refreshToken } as IUpdateTokenRequest,
          _retry: true,
        });

        const at = res?.data?.access_token;
        if (!at) return false;

        const expFromJwtMs = this.getExpiryFromJwt(at);
        const expiresAtMs =
          expFromJwtMs ??
          (typeof res.data.expires_in === "number"
            ? Date.now() + res.data.expires_in * 1000
            : null);

        this.setSession({
          accessToken: at,
          refreshToken: res.data.refresh_token,
          expiresAtMs,
          tokenType: res.data.token_type || "Bearer",
        });

        return true;
      } catch (e) {
        return false;
      } finally {
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise;
  }

  private async silentRelogin(): Promise<boolean> {
    const username = localStorage.getItem("username") ?? "";
    const password = localStorage.getItem("password") ?? "";
    if (!username || !password) return false;
    try {
      const res = await this.handleLogin({ username, password });
      return !!res?.data?.access_token;
    } catch {
      return false;
    }
  }

  async apiRequest<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const storedUrl = localStorage.getItem("url") ?? this.fallbackBaseUrl;
    const fullUrl = storedUrl + options.endpoint;

    let headers = new HttpHeaders({ "Content-Type": "application/json" });
    if (options.hasToken) {
      const accessToken = localStorage.getItem("accessToken") ?? "";
      if (accessToken) {
        const tokenType = localStorage.getItem("tokenType") || "Bearer";
        headers = headers.set("Authorization", `${tokenType} ${accessToken}`);
      }
    }

    let params: HttpParams | undefined;
    if (options.params) {
      params = new HttpParams({
        fromObject: Object.entries(options.params).reduce((acc, [k, v]) => {
          if (v !== null && v !== undefined && v !== "") acc[k] = String(v);
          return acc;
        }, {} as Record<string, string>),
      });
    }

    try {
      const resp = await lastValueFrom(
        this.http.request<T>(options.method, fullUrl, {
          body: options.body,
          headers,
          observe: "response",
          withCredentials: false,
          params,
        })
      );
      return { status: resp.status, data: resp.body as T };
    } catch (err) {
      const e = err as HttpErrorResponse;
      const is401 = e?.status === 401 || e?.status === 403;
      const alreadyRetried = options._retry === true;

      const isAuthPath =
        /\/(login|logout|refresh|update-token)$/i.test(options.endpoint) ||
        /\/protocol\/openid-connect\/token$/i.test(fullUrl);

      if (is401 && !alreadyRetried && !isAuthPath && options.hasToken) {
        let ok = await this.refreshViaBackend();

        if (!ok) ok = await this.silentRelogin();

        if (ok) {
          return this.apiRequest<T>({ ...options, _retry: true });
        }

        this.clearSession?.();
        await this.navigateTo("/unauthorized");
      }

      throw err;
    }
  }

  private clearSession() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("user");
    localStorage.removeItem("customerId");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
  }

  async logout(): Promise<ApiResponse<ILogoutResponse>> {
    const refreshToken = localStorage.getItem("refreshToken") ?? "";

    this.loader.showLoading("Uscita…");

    try {
      let apiRes: ApiResponse<ILogoutResponse> | null = null;
      if (refreshToken) {
        apiRes = await this.apiRequest<ILogoutResponse>({
          method: "POST",
          endpoint: environment.Logout,
          hasToken: false,
          body: { refreshToken },
        });
      }

      this.clearSession();
      await this.navigateTo("/");

      return apiRes ?? { status: 200, data: { message: "Logged out locally" } };
    } catch (err) {
      console.error("Logout failed:", err);
      this.clearSession();
      await this.navigateTo("/");

      const e = err as any;
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        e?.message ||
        (status === 0 ? "Impossibile contattare il server" : "Logout fallito");

      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }
}
