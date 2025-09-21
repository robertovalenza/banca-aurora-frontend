import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthStore {
  readonly loginOpen = signal(false);
  readonly registerOpen = signal(false);

  openLogin() {
    this.loginOpen.set(true);
    this.registerOpen.set(false);
  }
  openRegister() {
    this.registerOpen.set(true);
    this.loginOpen.set(false);
  }
  closeAll() {
    this.loginOpen.set(false);
    this.registerOpen.set(false);
  }
}
