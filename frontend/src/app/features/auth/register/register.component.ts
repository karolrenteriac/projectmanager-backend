import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="space-y-6">
      <div class="text-center lg:text-left">
        <h1 class="text-2xl font-bold text-foreground">Crear cuenta</h1>
        <p class="text-muted-foreground mt-2">Completa el formulario para registrarte</p>
      </div>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="space-y-2">
          <label for="name" class="label">Nombre completo</label>
          <input 
            id="name"
            type="text" 
            formControlName="name"
            class="input"
            placeholder="Tu nombre"
          />
          <p *ngIf="registerForm.get('name')?.touched && registerForm.get('name')?.errors?.['required']" 
             class="text-xs text-destructive">
            El nombre es requerido
          </p>
        </div>

        <div class="space-y-2">
          <label for="email" class="label">Correo electronico</label>
          <input 
            id="email"
            type="email" 
            formControlName="email"
            class="input"
            placeholder="tu@correo.com"
          />
          <p *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.errors?.['required']" 
             class="text-xs text-destructive">
            El correo es requerido
          </p>
          <p *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.errors?.['email']" 
             class="text-xs text-destructive">
            Ingresa un correo valido
          </p>
        </div>

        <div class="space-y-2">
          <label for="role" class="label">Rol</label>
          <select 
            id="role"
            formControlName="role"
            class="input"
          >
            <option value="co-researcher">Co-investigador</option>
            <option value="principal">Investigador Principal</option>
            <option value="coordinator">Coordinador</option>
          </select>
        </div>

        <div class="space-y-2">
          <label for="password" class="label">Contrasena</label>
          <input 
            id="password"
            type="password" 
            formControlName="password"
            class="input"
            placeholder="Minimo 6 caracteres"
          />
          <p *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.errors?.['required']" 
             class="text-xs text-destructive">
            La contrasena es requerida
          </p>
          <p *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.errors?.['minlength']" 
             class="text-xs text-destructive">
            La contrasena debe tener al menos 6 caracteres
          </p>
        </div>

        <div class="space-y-2">
          <label for="confirmPassword" class="label">Confirmar contrasena</label>
          <input 
            id="confirmPassword"
            type="password" 
            formControlName="confirmPassword"
            class="input"
            placeholder="Repite tu contrasena"
          />
          <p *ngIf="registerForm.get('confirmPassword')?.touched && passwordMismatch" 
             class="text-xs text-destructive">
            Las contrasenas no coinciden
          </p>
        </div>

        <div *ngIf="error" class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary w-full"
          [disabled]="registerForm.invalid || isLoading || passwordMismatch"
        >
          <span *ngIf="isLoading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Creando cuenta...
          </span>
          <span *ngIf="!isLoading">Crear cuenta</span>
        </button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        Ya tienes una cuenta? 
        <a routerLink="/auth/login" class="text-primary hover:underline font-medium">
          Iniciar sesion
        </a>
      </p>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['co-researcher', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    if (this.authService.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }

  get passwordMismatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password !== confirmPassword && confirmPassword?.length > 0;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.passwordMismatch) return;

    this.isLoading = true;
    this.error = '';

    const { name, email, password, role } = this.registerForm.value;

    this.authService.register(name, email, password, role).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Error al crear la cuenta. Intenta de nuevo.';
      }
    });
  }
}
