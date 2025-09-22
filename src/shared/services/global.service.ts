import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ILoan } from "../interfaces/api";

@Injectable({
  providedIn: "root",
})
export class GlobalService {
  private loansList: BehaviorSubject<ILoan[]> = new BehaviorSubject<ILoan[]>(
    []
  );
  loansList$ = this.loansList.asObservable();
  constructor() {}

  setLoans(loans: ILoan[]) {
    this.loansList.next(loans);
  }
}
