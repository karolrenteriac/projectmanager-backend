import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="flex items-center justify-center" [ngClass]="fullScreen ? 'h-screen' : 'py-12'">
      <div class="flex flex-col items-center gap-3">
        <div class="relative">
          <div class="h-10 w-10 rounded-full border-4 border-secondary"></div>
          <div class="absolute top-0 left-0 h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p *ngIf="message" class="text-sm text-muted-foreground">{{ message }}</p>
      </div>
    </div>
  `
})
export class LoadingComponent {
  @Input() message = 'Cargando...';
  @Input() fullScreen = false;
}
