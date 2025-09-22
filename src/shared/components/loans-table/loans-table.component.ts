import { Component } from "@angular/core";
import { ILoan } from "../../interfaces/api";
import { CommonModule } from "@angular/common";
import { Subscription } from "rxjs";
import { GlobalService } from "../../services/global.service";

@Component({
  selector: "app-loans-table",
  imports: [CommonModule],
  templateUrl: "./loans-table.component.html",
  styleUrl: "./loans-table.component.scss",
})
export class LoansTableComponent {
  loansTable: ILoan[] = [];
  subscription: Subscription = new Subscription();

  constructor(private service: GlobalService) {}

  async ngOnInit() {
    this.subscription.add(
      this.service.loansList$.subscribe((loans) => {
        this.loansTable = loans;
      })
    );
  }
}
