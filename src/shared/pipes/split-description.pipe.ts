import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "splitDescription", standalone: true })
export class SplitDescriptionPipe implements PipeTransform {
  transform(desc: string): string[] {
    if (!desc) return [""];

    const s = desc.trim();
    const lower = s.toLowerCase();

    // 1) Se contiene "percentuale": vai a capo sulla parola "percentuale"
    if (lower.includes("percentuale")) {
      const i = lower.indexOf("percentuale");
      return [s.slice(0, i).trim(), s.slice(i).trim()];
    }

    // 2) "Paesi supportati" -> "Paesi" / "supportati"
    if (lower === "paesi supportati") {
      return ["Paesi", "supportati"];
    }

    // 3) "Valutazione su App Store e Play Store"
    //    -> "valutazione su app store" / "& play store" (minuscolo + &)
    if (
      lower.includes("valutazione su") &&
      lower.includes("app store") &&
      lower.includes("play store")
    ) {
      return ["valutazione su app store", "& play store"];
    }

    // default: nessun a capo speciale
    return [s];
  }
}
