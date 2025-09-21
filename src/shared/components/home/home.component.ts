import { Component } from "@angular/core";
import { NavbarComponent } from "../navbar/navbar.component";
import { HomeContentComponent } from "../home-content/home-content.component";
import { HomeFooterComponent } from "../home-footer/home-footer.component";

@Component({
  selector: "app-home",
  imports: [NavbarComponent, HomeContentComponent, HomeFooterComponent],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {}
