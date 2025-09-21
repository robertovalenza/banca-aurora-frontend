import { Component, DestroyRef, effect, inject, signal } from "@angular/core";
import { AuthStore } from "../../stores/auth.store";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";

@Component({
  selector: "app-modal-login",
  imports: [ReactiveFormsModule],
  templateUrl: "./modal-login.component.html",
  styleUrl: "./modal-login.component.scss",
})
export class ModalLoginComponent {
  auth = inject(AuthStore);
  fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    remember: [false],
  });

  private readonly eff = effect(() => {
    document.body.style.overflow =
      this.auth.loginOpen() || this.auth.registerOpen() ? "hidden" : "";
  });
  constructor() {
    this.destroyRef.onDestroy(() => this.eff.destroy());
  }

  get email() {
    return this.form.controls.email;
  }
  get password() {
    return this.form.controls.password;
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.auth.closeAll();
  }

  forgotPassword() {
    alert('Funzione "Password dimenticata?" da implementare.');
  }
}
