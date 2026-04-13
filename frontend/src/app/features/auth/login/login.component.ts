import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="space-y-6">
      <div class="text-center lg:text-left">
        <h1 class="text-2xl font-bold text-foreground">Bienvenido de vuelta</h1>
        <p class="text-muted-foreground mt-2">Ingresa tus credenciales para acceder</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="space-y-2">
          <label for="email" class="label">Correo electronico</label>
          <input 
            id="email"
            type="email" 
            formControlName="email"
            class="input"
            placeholder="tu@correo.com"
          />
          <p *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.errors?.['required']" 
             class="text-xs text-destructive">
            El correo es requerido
          </p>
          <p *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.errors?.['email']" 
             class="text-xs text-destructive">
            Ingresa un correo valido
          </p>
        </div>

        <div class="space-y-2">
          <label for="password" class="label">Contrasena</label>
          <input 
            id="password"
            type="password" 
            formControlName="password"
            class="input"
            placeholder="Tu contrasena"
          />
          <p *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.errors?.['required']" 
             class="text-xs text-destructive">
            La contrasena es requerida
          </p>
        </div>

        <div *ngIf="error" class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary w-full"
          [disabled]="loginForm.invalid || isLoading"
        >
          <span *ngIf="isLoading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Iniciando sesion...
          </span>
          <span *ngIf="!isLoading">Iniciar sesion</span>
        </button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        No tienes una cuenta? 
        <a routerLink="/auth/register" class="text-primary hover:underline font-medium">
          Registrate
        </a>
      </p>
    </div>
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  error = '';
  returnUrl = '/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    if (this.authService.isAuthenticated) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate([this.returnUrl]);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Error al iniciar sesion. Verifica tus credenciales.';
      }
    });
  }
}
