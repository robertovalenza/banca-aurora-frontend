import { Component, input } from "@angular/core";

@Component({
  selector: "app-open-account",
  imports: [],
  templateUrl: "./open-account.component.html",
  styleUrl: "./open-account.component.scss",
})
export class OpenAccountComponent {
  padding = input<string | number | null>(null);
  hasArrow = input<boolean>(false);

  normalizePadding(pad: string | number | null): string | null {
    if (pad == null) return null;
    if (typeof pad === "number") return `${pad}px`;
    return pad.trim();
  }
}
