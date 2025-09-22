import { Component, inject } from "@angular/core";
import { LoaderService } from "../../services/loader.service";

@Component({
  selector: "app-loading-overlay",
  imports: [],
  templateUrl: "./loading-overlay.component.html",
  styleUrl: "./loading-overlay.component.scss",
})
export class LoadingOverlayComponent {
  loader = inject(LoaderService);
}
