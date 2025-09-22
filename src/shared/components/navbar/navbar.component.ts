import { Component } from "@angular/core";
import { OpenAccountComponent } from "../open-account/open-account.component";

@Component({
  selector: "app-navbar",
  imports: [OpenAccountComponent],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {}
