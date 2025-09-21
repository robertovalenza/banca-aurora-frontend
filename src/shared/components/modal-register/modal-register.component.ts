import { Component, DestroyRef, effect, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { AuthStore } from "../../stores/auth.store";

@Component({
  selector: "app-modal-register",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./modal-register.component.html",
  styleUrls: ["./modal-register.component.scss"],
})
export class ModalRegisterComponent {
  auth = inject(AuthStore);
  fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    nome: ["", [Validators.required]],
    cognome: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });

  private readonly eff = effect(() => {
    document.body.style.overflow =
      this.auth.loginOpen() || this.auth.registerOpen() ? "hidden" : "";
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.eff.destroy());
  }

  get nome() {
    return this.form.controls.nome;
  }
  get cognome() {
    return this.form.controls.cognome;
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
}
