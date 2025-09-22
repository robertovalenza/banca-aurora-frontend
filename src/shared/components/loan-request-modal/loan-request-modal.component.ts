import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from "@angular/core";
import { Validators, FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { HttpService } from "../../services/http.service";
import { GlobalService } from "../../services/global.service";

@Component({
  selector: "app-loan-request-modal",
  imports: [ReactiveFormsModule],
  templateUrl: "./loan-request-modal.component.html",
  styleUrl: "./loan-request-modal.component.scss",
})
export class LoanRequestModalComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  private fb = inject(FormBuilder);
  submitting = signal(false);

  form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    months: [null as number | null, [Validators.required, Validators.min(1)]],
    purpose: ["", [Validators.required, Validators.minLength(3)]],
  });

  constructor(private http: HttpService, private service: GlobalService) {}

  get amount() {
    return this.form.controls.amount;
  }
  get months() {
    return this.form.controls.months;
  }
  get purpose() {
    return this.form.controls.purpose;
  }

  close() {
    this.form.reset({ amount: null, months: null, purpose: "" });
    this.submitting.set(false);
    this.closed.emit();
  }

  async submit() {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { amount, months, purpose } = this.form.getRawValue();

    try {
      const res = await this.http.sendLoanRequest({
        amount: Number(amount),
        months: Number(months),
        purpose: String(purpose).trim(),
      });
      if (res.status === 200 || res.status === 201) {
        await this.http.getLoans({}).then((res) => {
          if (res.status === 200 && res.data) {
            this.service.setLoans(res.data.items);
          }
        });
        this.close();
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
