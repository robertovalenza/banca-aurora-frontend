import { Component, inject, input } from "@angular/core";
import { AuthStore } from "../../stores/auth.store";

@Component({
  selector: "app-open-account",
  imports: [],
  templateUrl: "./open-account.component.html",
  styleUrl: "./open-account.component.scss",
})
export class OpenAccountComponent {
  padding = input<string | number | null>(null);
  hasArrow = input<boolean>(false);
  modal = inject(AuthStore);

  normalizePadding(pad: string | number | null): string | null {
    if (pad == null) return null;
    if (typeof pad === "number") return `${pad}px`;
    return pad.trim();
  }
}
