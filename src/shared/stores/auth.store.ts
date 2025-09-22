import { Injectable, signal } from "@angular/core";
import { HttpService } from "../services/http.service";
import { IRegisterRequest } from "../interfaces/api";

@Injectable({ providedIn: "root" })
export class AuthStore {
  private _loginOpen = signal(false);
  private _registerOpen = signal(false);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _user = signal<any | null>(null);

  constructor(private http: HttpService) {}

  loginOpen = this._loginOpen.asReadonly();
  registerOpen = this._registerOpen.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  user = this._user.asReadonly();

  openLogin() {
    this._loginOpen.set(true);
    this._registerOpen.set(false);
  }

  openRegister() {
    this._loginOpen.set(false);
    this._registerOpen.set(true);
  }

  closeAll() {
    this._loginOpen.set(false);
    this._registerOpen.set(false);
    this._error.set(null);
  }

  async login(
    email: string,
    password: string,
    remember: boolean
  ): Promise<void> {
    this._error.set(null);
    this._loading.set(true);

    try {
      const res = await this.http.handleLogin({ username: email, password });

      if (remember) {
        localStorage.setItem("username", email);
      } else {
        localStorage.removeItem("username");
      }
      console.log("Login successful:", res.data);
      this.closeAll();
    } catch (e: any) {
      const msg =
        e?.data?.message ||
        e?.message ||
        "Accesso non riuscito. Controlla le credenziali o riprova più tardi.";
      this._error.set(msg);
    } finally {
      this._loading.set(false);
    }
  }

  async register(req: IRegisterRequest): Promise<void> {
    this._error.set(null);
    this._loading.set(true);
    try {
      const res = await this.http.handleRegister(req);

      if (!res.data?.access_token) {
        await this.http.handleLogin({
          username: req.username,
          password: req.password,
        });
      }
      this.closeAll();
    } catch (e: any) {
      const msg =
        e?.data?.message ||
        e?.message ||
        "Registrazione non riuscita. Riprova più tardi.";
      this._error.set(msg);
    } finally {
      this._loading.set(false);
    }
  }
}
