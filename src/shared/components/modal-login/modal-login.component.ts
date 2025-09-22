// modal-login.component.ts
import { Component, DestroyRef, effect, inject, signal } from "@angular/core";
import { AuthStore } from "../../stores/auth.store";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { CdkTrapFocus } from "@angular/cdk/a11y"; // 👈

@Component({
  selector: "app-modal-login",
  imports: [ReactiveFormsModule, CdkTrapFocus],
  templateUrl: "./modal-login.component.html",
  styleUrl: "./modal-login.component.scss",
})
export class ModalLoginComponent {
  auth = inject(AuthStore);
  fb = inject(FormBuilder);
  showPassword = signal(false);
  private destroyRef = inject(DestroyRef);

  form = this.fb.nonNullable.group({
    username: ["", [Validators.required, Validators.minLength(3)]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });

  private readonly eff = effect(() => {
    const open = this.auth.loginOpen();
    document.body.style.overflow =
      open || this.auth.registerOpen() ? "hidden" : "";
    if (!open) {
      this.form.reset({
        username: "",
        password: "",
      });
      this.showPassword.set(false);
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.eff.destroy());
  }

  get username() {
    return this.form.controls.username;
  }

  get password() {
    return this.form.controls.password;
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  async submit() {
    if (this.form.invalid || this.auth.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    await this.auth.login(username, password);
  }
}
