// create-customer-modal.component.ts
import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  effect,
} from "@angular/core";
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  ValidatorFn,
  AbstractControl,
  FormGroup,
} from "@angular/forms";
import { HttpService } from "../../services/http.service";

@Component({
  selector: "app-create-customer-modal",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./create-customer-modal.component.html",
  styleUrl: "./create-customer-modal.component.scss",
})
export class CreateCustomerModalComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private http = inject(HttpService);
  submitting = signal(false);

  form!: FormGroup;

  private cfPattern = /^[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/;
  private fiscalCodeValidator: ValidatorFn = (control: AbstractControl) => {
    const raw = (control.value ?? "").toString().trim().toUpperCase();
    if (!raw) return null;
    return this.cfPattern.test(raw) ? null : { cfInvalid: true };
  };

  constructor() {
    this.form = this.fb.nonNullable.group({
      firstName: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      fiscalCode: ["", [Validators.required, this.fiscalCodeValidator]],
      incomeMonthly: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private _prefillEff = effect(() => {
    if (this.open && this.form) {
      const fn = (localStorage.getItem("firstName") || "").trim();
      const ln = (localStorage.getItem("lastName") || "").trim();
      this.form.patchValue(
        { firstName: fn, lastName: ln },
        { emitEvent: false }
      );
    }
  });

  close() {
    this.form.reset({
      firstName: "",
      lastName: "",
      fiscalCode: "",
      incomeMonthly: 0,
    });
    this.submitting.set(false);
    this.closed.emit();
  }

  async submit() {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const value = this.form.getRawValue() as {
        firstName: string;
        lastName: string;
        fiscalCode: string;
        incomeMonthly: number;
      };
      value.fiscalCode = value.fiscalCode.trim().toUpperCase();
      await this.http.createCustomer(value);
      this.created.emit();
      this.close();
    } finally {
      this.submitting.set(false);
    }
  }

  get fiscalCodeCtrl() {
    return this.form.get("fiscalCode");
  }
}
