import { Injectable, signal } from "@angular/core";
import { Subject } from "rxjs";

export type LoaderState = { isLoading: boolean; message: string };
export type AlertPayload = { header?: string; message?: string };

@Injectable({ providedIn: "root" })
export class LoaderService {
  readonly loading = signal<LoaderState>({ isLoading: false, message: "" });

  readonly alert$ = new Subject<AlertPayload>();

  showLoading(message = "Caricamento…") {
    this.loading.set({ isLoading: true, message });
  }

  hideLoading() {
    this.loading.set({ isLoading: false, message: "" });
  }

  presentAlert(header = "Attenzione!", message = "Si è verificato un errore…") {
    this.alert$.next({ header, message });
  }
}
