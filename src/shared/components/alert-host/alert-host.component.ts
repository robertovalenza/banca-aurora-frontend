import { Component, inject, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { LoaderService } from "../../services/loader.service";

@Component({
  selector: "app-alert-host",
  imports: [],
  templateUrl: "./alert-host.component.html",
  styleUrl: "./alert-host.component.scss",
})
export class AlertHostComponent implements OnDestroy {
  private sub: Subscription;
  loader = inject(LoaderService);

  open = false;
  header = "Attenzione!";
  message = "Si è verificato un errore…";

  constructor() {
    this.sub = this.loader.alert$.subscribe(({ header, message }) => {
      this.header = header ?? this.header;
      this.message = message ?? this.message;
      this.open = true;
    });
  }

  close() {
    this.open = false;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
