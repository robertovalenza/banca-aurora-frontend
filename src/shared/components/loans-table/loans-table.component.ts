import { Component } from "@angular/core";
import { HttpService } from "../../services/http.service";
import { ILoan } from "../../interfaces/api";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-loans-table",
  imports: [CommonModule],
  templateUrl: "./loans-table.component.html",
  styleUrl: "./loans-table.component.scss",
})
export class LoansTableComponent {
  loansTable: ILoan[] = [];
  constructor(private httpService: HttpService) {}

  async ngOnInit() {
    await this.httpService.getLoans({}).then((res) => {
      if (res.status === 200) this.loansTable = res.data.items;
      console.log(res.data.items);
    });
  }
}
