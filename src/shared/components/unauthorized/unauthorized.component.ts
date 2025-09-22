import { Component } from "@angular/core";
import { HttpService } from "../../services/http.service";

@Component({
  selector: "app-unauthorized",
  imports: [],
  templateUrl: "./unauthorized.component.html",
  styleUrl: "./unauthorized.component.scss",
})
export class UnauthorizedComponent {
  constructor(private http: HttpService) {}

  navigateToHome() {
    this.http.navigateTo("/");
  }
}
