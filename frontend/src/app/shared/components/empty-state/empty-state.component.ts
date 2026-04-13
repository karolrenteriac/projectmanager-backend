import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-foreground mb-2">{{ title }}</h3>
      <p class="text-sm text-muted-foreground mb-6 max-w-sm">{{ description }}</p>
      <button 
        *ngIf="actionLabel"
        (click)="action.emit()"
        class="btn btn-primary"
      >
        {{ actionLabel }}
      </button>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() title = 'No hay datos';
  @Input() description = 'No se encontraron elementos para mostrar.';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}
