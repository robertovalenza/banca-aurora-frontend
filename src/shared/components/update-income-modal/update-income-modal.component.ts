import {
  Component,
  effect,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { HttpService } from "../../services/http.service";

@Component({
  selector: "app-update-income-modal",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./update-income-modal.component.html",
  styleUrl: "./update-income-modal.component.scss",
})
export class UpdateIncomeModalComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<number>();

  private fb = inject(FormBuilder);
  private http = inject(HttpService);
  submitting = signal(false);

  form = this.fb.nonNullable.group({
    incomeMonthly: [0, [Validators.required, Validators.min(0)]],
  });

  _eff = effect(() => {
    if (this.open) {
      const userRaw = localStorage.getItem("user");
      let current = 0;
      if (userRaw) {
        try {
          current = Number(JSON.parse(userRaw)?.incomeMonthly ?? 0);
        } catch {}
      }
      this.form.patchValue(
        { incomeMonthly: isNaN(current) ? 0 : current },
        { emitEvent: false }
      );
    }
  });

  get incomeMonthly() {
    return this.form.controls.incomeMonthly;
  }

  close() {
    this.form.reset({ incomeMonthly: 0 });
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
      const value = this.form.getRawValue().incomeMonthly;
      await this.http.updateIncomeMonthly(value);
      this.updated.emit(value);
      this.close();
    } finally {
      this.submitting.set(false);
    }
  }
}
