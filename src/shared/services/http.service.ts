import { inject, Injectable } from "@angular/core";
import {
  ApiRequestOptions,
  ApiResponse,
  LoginRequest,
  LoginResponse,
} from "../interfaces/api";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from "@angular/common/http";
import { lastValueFrom } from "rxjs";
import { environment } from "../../app/environments/environments";
import { LoaderService } from "./loader.service";

@Injectable({
  providedIn: "root",
})
export class HttpService {
  private http = inject(HttpClient);
  private fallbackBaseUrl = environment.apiUrl ?? "";

  constructor(private loader: LoaderService) {}

  private getExpiryFromJwt(token: string): number | null {
    try {
      const [, payload] = token.split(".");
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      );
      // exp è in secondi epoch
      return typeof decoded?.exp === "number" ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  // --- helper: salva in sessione ---
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
      if (accessToken)
        headers = headers.set("Authorization", `Bearer ${accessToken}`);
    }

    try {
      const response = await lastValueFrom(
        this.http.request<T>(options.method, fullUrl, {
          body: options.body,
          headers,
          observe: "response",
          withCredentials: false,
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
  }): Promise<ApiResponse<LoginResponse>> {
    const username = creds?.username ?? localStorage.getItem("username") ?? "";
    const password = creds?.password ?? localStorage.getItem("password") ?? "";

    if (!username || !password) {
      return Promise.reject({
        status: 400,
        data: { message: "Credenziali mancanti" } as any,
      });
    }

    const body: LoginRequest = { username, password };
    this.loader.showLoading("Autenticazione…");

    try {
      const response = await this.apiRequest<LoginResponse>({
        method: "POST",
        endpoint: environment.Login,
        body,
        hasToken: false,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      if (!access_token) {
        return Promise.reject({
          status: 500,
          data: { message: "Token assente nella risposta di login" } as any,
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
}
