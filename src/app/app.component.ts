import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AlertHostComponent } from "../shared/components/alert-host/alert-host.component";
import { LoadingOverlayComponent } from "../shared/components/loading-overlay/loading-overlay.component";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, AlertHostComponent, LoadingOverlayComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  title = "banca-aurora";
}
