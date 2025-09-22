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
  IRegisterRequest,
  IRegisterResponse,
  ISendLoanAndDecisionResponse,
  ISendLoanRequest,
  ISendLoanResponse,
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
      // NON mostro alert qui: il chiamante decide (per aprire la modale)
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
    // validazione minima
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

      // salva subito customerId per le chiamate successive
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

      // 1) invio richiesta prestito
      const sendRes = await this.apiRequest<ISendLoanResponse>({
        method: "POST",
        endpoint: environment.SendLoanRequest, // es.: '/loan-applications/SendLoanApplication'
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

      // 2) decisione immediata con applicationId
      const decideRes = await this.getLoanDecision(appId);

      // 3) ritorno combinato: dati della submission + decisione
      const combined: ISendLoanAndDecisionResponse = {
        ...sendRes.data,
        decision: decideRes.data,
      };

      // status complessivo: riuso lo status della decision (o quello della POST se preferisci)
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

    // niente loader qui: lo gestisce sendLoanRequest per l’intero flusso
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

      // aggiorna cache utente locale se presente
      if (res?.data) {
        localStorage.setItem("user", JSON.stringify(res.data));
      } else {
        // se la risposta non ritorna il profilo, aggiorna comunque il valore nel "user" in LS se esiste
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
}
