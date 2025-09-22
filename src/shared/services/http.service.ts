import { inject, Injectable } from "@angular/core";
import {
  ApiRequestOptions,
  ApiResponse,
  ICustomer,
  ILoansPage,
  ILoginRequest,
  ILoginResponse,
  IRegisterRequest,
  IRegisterResponse,
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

@Injectable({
  providedIn: "root",
})
export class HttpService {
  private http = inject(HttpClient);
  private fallbackBaseUrl = environment.apiUrl ?? "";

  constructor(private loader: LoaderService, private router: Router) {}

  navigateTo(url?: string): Promise<boolean> {
    if (url) {
      return this.router.navigateByUrl(url);
    }
    return Promise.resolve(false);
  }
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
    user?: any;
  }) {
    localStorage.setItem("accessToken", opts.accessToken);
    if (opts.refreshToken)
      localStorage.setItem("refreshToken", opts.refreshToken);
    if (opts.expiresAtMs)
      localStorage.setItem("tokenExpiry", String(opts.expiresAtMs));
    if (opts.user) localStorage.setItem("user", JSON.stringify(opts.user));
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

    // <-- NEW: costruisci HttpParams solo dai valori definiti
    let params: HttpParams | undefined;
    if (options.params) {
      const p = new HttpParams({
        fromObject: Object.entries(options.params).reduce((acc, [k, v]) => {
          if (v !== null && v !== undefined && v !== "") acc[k] = String(v);
          return acc;
        }, {} as Record<string, string>),
      });
      params = p;
    }

    try {
      const response = await lastValueFrom(
        this.http.request<T>(options.method, fullUrl, {
          body: options.body,
          headers,
          observe: "response",
          withCredentials: false,
          params, // <-- NEW
        })
      );
      return { status: response.status, data: response.body as T };
    } catch (error) {
      console.error("errore richiesta API:", error);
      throw error;
    }
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

  // Ricava l'id cliente dagli oggetti profilo (adatta se cambia il nome campo)
  private extractCustomerId(profile: any): string | null {
    return profile?.customerId ?? profile?.id ?? null;
  }

  /** Ottiene customerId da localStorage o lo scarica (senza mostrare loader) */
  private async ensureCustomerId(): Promise<string> {
    const cached = localStorage.getItem("customerId");
    if (cached) return cached;

    try {
      const res = await this.apiRequest<ICustomer>({
        method: "GET",
        endpoint: environment.GetOwnCustomerData, // es. '/customers/me'
        hasToken: true,
        _retry: true, // evita retry loops nel refresh
      });

      const cid = this.extractCustomerId(res.data);
      if (cid) {
        localStorage.setItem("customerId", cid);
        // opzionale: cache anche il profilo completo
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
    customerId?: string | number; // ora opzionale
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
    this.loader.showLoading("Recupero dati in corso...");

    try {
      const res = await this.apiRequest<ICustomer>({
        method: "GET",
        endpoint: environment.GetOwnCustomerData,
        hasToken: true,
      });

      if (res?.data) {
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
          : "Errore nel recupero dei dati utente");

      this.loader.presentAlert(
        "Errore",
        `Recupero profilo non riuscito: ${message}`
      );
      return Promise.reject({ status, data: { message } as any });
    } finally {
      this.loader.hideLoading();
    }
  }
}
