import { Component } from "@angular/core";
import { resultsList } from "../../models/results";

@Component({
  selector: "app-home-footer",
  imports: [],
  templateUrl: "./home-footer.component.html",
  styleUrl: "./home-footer.component.scss",
})
export class HomeFooterComponent {
  resultsList = resultsList;
}
