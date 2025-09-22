import { Injectable, signal, effect } from "@angular/core";

@Injectable({ providedIn: "root" })
export class UiStore {
  private _drawerOpen = signal(false);

  drawerOpen = this._drawerOpen.asReadonly();

  openDrawer() {
    this._drawerOpen.set(true);
  }
  closeDrawer() {
    this._drawerOpen.set(false);
  }
  toggleDrawer() {
    this._drawerOpen.update((v) => !v);
  }

  private _eff = effect(() => {
    document.body.style.overflow = this._drawerOpen() ? "hidden" : "";
  });
}
