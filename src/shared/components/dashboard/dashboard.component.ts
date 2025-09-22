import { Component, signal } from "@angular/core";
import { LoansTableComponent } from "../loans-table/loans-table.component";
import { HttpService } from "../../services/http.service";
import { LoanRequestModalComponent } from "../loan-request-modal/loan-request-modal.component";
import { GlobalService } from "../../services/global.service";
import { CreateCustomerModalComponent } from "../create-customer-modal/create-customer-modal.component";

@Component({
  selector: "app-dashboard",
  imports: [
    LoansTableComponent,
    LoanRequestModalComponent,
    CreateCustomerModalComponent,
  ],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
})
export class DashboardComponent {
  requestOpen = signal(false);
  createCustomerOpen = signal(false);

  constructor(
    private httpService: HttpService,
    private service: GlobalService
  ) {}

  async ngOnInit() {
    try {
      // 1 sola chiamata, così se fa 404 lo intercetti qui
      const res = await this.httpService.getOwnCustomerData();
      if (res.status === 200) {
        await this.loadLoans();
      }
    } catch (e: any) {
      if ((e?.status ?? 0) === 404 || !localStorage.getItem("customerId")) {
        // nessun profilo ⇒ apri modale creazione
        this.createCustomerOpen.set(true);
      } else {
        // opzionale: gestisci altri errori (rete, 500, ecc.)
        console.error("getOwnCustomerData failed:", e);
      }
    }
  }

  async loadLoans() {
    const res = await this.httpService.getLoans({});
    if (res.status === 200 && res.data) {
      this.service.setLoans(res.data.items);
    }
  }

  openRequestModal() {
    this.requestOpen.set(true);
  }
  onModalClosed() {
    this.requestOpen.set(false);
  }

  onCreateClosed() {
    this.createCustomerOpen.set(false);
  }
  async onCustomerCreated() {
    this.createCustomerOpen.set(false);
    await this.loadLoans(); // ora che c'è il profilo, carica le loans
  }
}
