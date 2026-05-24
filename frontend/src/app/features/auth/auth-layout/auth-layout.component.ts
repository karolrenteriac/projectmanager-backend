import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="min-h-screen bg-background flex">
      <!-- Left Panel - Branding -->
      <div class="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-12">
        <div>
          <h1 class="text-2xl font-bold text-primary">Project Manager</h1>
        </div>
        <div class="space-y-6">
          <h2 class="text-4xl font-bold text-foreground leading-tight text-balance">
            Gestiona tus proyectos de investigacion de manera eficiente
          </h2>
          <p class="text-lg text-muted-foreground">
            Colabora con tu equipo, organiza tareas y alcanza tus objetivos.
          </p>
          <div class="flex gap-8 pt-4">
            <div>
              <p class="text-3xl font-bold text-primary">500+</p>
              <p class="text-sm text-muted-foreground">Proyectos activos</p>
            </div>
            <div>
              <p class="text-3xl font-bold text-primary">2.5k+</p>
              <p class="text-sm text-muted-foreground">Investigadores</p>
            </div>
            <div>
              <p class="text-3xl font-bold text-primary">98%</p>
              <p class="text-sm text-muted-foreground">Satisfaccion</p>
            </div>
          </div>
        </div>
        <p class="text-sm text-muted-foreground">
          2024 Project Manager. Todos los derechos reservados.
        </p>
      </div>

      <!-- Right Panel - Auth Forms -->
      <div class="flex-1 flex items-center justify-center p-6">
        <div class="w-full max-w-md">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AuthLayoutComponent { }
