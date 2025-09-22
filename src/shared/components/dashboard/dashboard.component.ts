import { Component } from "@angular/core";
import { LoansTableComponent } from "../loans-table/loans-table.component";
import { HttpService } from "../../services/http.service";

@Component({
  selector: "app-dashboard",
  imports: [LoansTableComponent],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent {
  constructor(private httpService: HttpService) {}
  async ngOnInit() {
    await this.httpService.getOwnCustomerData().then((res) => {
      if (res.status === 200) {
        console.log(res.data);
      }
    });
  }
}
