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
    username: ["", [Validators.required, Validators.minLength(3)]],
    nome: ["", [Validators.required]],
    cognome: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
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

  async submit() {
    if (this.form.invalid || this.auth.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();

    await this.auth.register({
      username: v.username,
      email: v.email,
      password: v.password,
      firstName: v.nome,
      lastName: v.cognome,
    });
  }
}
