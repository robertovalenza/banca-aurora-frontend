import { Component } from "@angular/core";
import { CreditCardComponent } from "../credit-card/credit-card.component";
import { OpenAccountComponent } from "../open-account/open-account.component";

@Component({
  selector: "app-home-content",
  imports: [CreditCardComponent, OpenAccountComponent],
  templateUrl: "./home-content.component.html",
  styleUrl: "./home-content.component.scss",
})
export class HomeContentComponent {}
