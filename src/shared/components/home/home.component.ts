import { Component } from "@angular/core";
import { NavbarComponent } from "../navbar/navbar.component";
import { HomeContentComponent } from "../home-content/home-content.component";
import { HomeFooterComponent } from "../home-footer/home-footer.component";
import { ModalLoginComponent } from "../modal-login/modal-login.component";
import { ModalRegisterComponent } from "../modal-register/modal-register.component";
import { UnauthorizedComponent } from "../unauthorized/unauthorized.component";

@Component({
  selector: "app-home",
  imports: [
    NavbarComponent,
    HomeContentComponent,
    HomeFooterComponent,
    ModalLoginComponent,
    ModalRegisterComponent,
    UnauthorizedComponent,
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {}
